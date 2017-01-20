var express = require('express');
var router = express.Router();
var OMEGARATE = 1
var ALPHARATE = 3
var BRAVORATE = 5
var CHARLIERATE = 8
var DELTARATE = 9
var ECHORATE = 10
var NORMALIZER = 10

// Connect to DB
var mysql = require('mysql')
var connection = mysql.createConnection({
  	host: 'localhost',
  	user: 'root',
  	password: 'chocolate'
})

connection.query('USE Flow;', function (err, rows, fields) {
  	if (err) throw err
  	console.log('Using Flow DB.')
})


// GET home page.
router.get('/', function (req, res, next) {
	var response = res;
	console.dir(req.query.valid)
	if(req.query.valid == "false") console.log("invalid!")
	connection.query('SELECT * FROM WaitingRooms;', function (err, rows, fields) {
	  	if (err) throw err
	  	calculateTimes(rows);
	  	console.log("GET home page:\n\n")
	  	console.log(rows)
	  	response.render('index', { data: rows });
  	});
});  


// GET hospital admin page.
router.get('/:HospitalID', function (req, res, next) {
	var response = res;

	// Check if valid hospital ID
	connection.query('SELECT * FROM WaitingRooms WHERE HospitalID = "' + req.params.HospitalID + '";', function (err0, rows0, fields0){
		if (err0) throw err0
		if (rows0[0] == undefined){
			// If we get back undefined rows, then the hospital ID was invalid
  			response.redirect('/?valid=false');
  			return;
		}
		connection.query('SELECT PatientID AS PatientID, PatientStatus AS PatientStatus, HospitalID AS HospitalID, COALESCE(DATE_FORMAT(WaitTimeStart, "%H:%i"), "-1") AS WaitTimeStart, COALESCE(DATE_FORMAT(WaitTimeEnd, "%H:%i"), "Click to discharge") AS WaitTimeEnd FROM Patients WHERE HospitalID = "' + req.params.HospitalID + '" AND WaitTimeEnd IS NULL AND Deleted = False ORDER BY PatientID DESC;', function (err1, rows1, fields1){
			if (err1) throw err1
			console.log("GET hospital admin page:\n\n")
			console.log(rows0)
		  	console.log(rows1)
		  	connection.query('SELECT * FROM ActivityLog WHERE HospitalID = ' + req.params.HospitalID + ' ORDER BY LogID DESC LIMIT 3;', function (logerr, logrows, logfields){
		  		console.log("\n\nSENT LOG DATA:\n\n");
		  		console.log(logrows);
				response.render('admin', { HospitalName: rows0[0]["HospitalName"], patients: rows1, LogData: logrows });
		  	})
		});
	});
});


// POST hospital admin page.
router.post('/:HospitalID', function (req, res, next) {
	console.log("POST request")
	console.log(req.params.HospitalID)
	var response = res;

	// Check if valid hospital ID
	connection.query('SELECT * FROM WaitingRooms WHERE HospitalID = "' + req.params.HospitalID + '";', function (err, rows, fields){
		if (err) throw err
	});

    // Check if admitting or treating (or deleting)
	if (parseInt(req.body.PatientStatus) <= 6){
		var incrementValue = 1
	}
	else {
		var incrementValue = -1
	}

	// Check what MySQL token is needed based on Patient urgency category
	var token;
	switch (parseInt(req.body.PatientStatus) % 6 ) {
	    case 1:
	        token = "OmegaPatients = OmegaPatients + ";
	        break;
	    case 2:
	        token = "AlphaPatients = AlphaPatients + ";
	        break;
	    case 3:
	        token = "BravoPatients = BravoPatients + ";
	        break;
	    case 4:
	        token = "CharliePatients = CharliePatients + ";
	        break;
	    case 5:
	        token = "DeltaPatients = DeltaPatients + ";
	        break;
	    case 0:
	        token = "EchoPatients = EchoPatients + ";
	        break;
	}

    // Update the WaitingRooms table by incrementing the relevant tier's queue
    console.log("UPDATE WaitingRooms SET " 
						 + token
						 + incrementValue 
						 + " WHERE HospitalID = "
						 + req.params.HospitalID
						 + ";");
    connection.query("UPDATE WaitingRooms SET " 
						 + token
						 + incrementValue 
						 + " WHERE HospitalID = "
						 + req.params.HospitalID
						 + ";");

	// Add new patient to queue
	if (parseInt(req.body.PatientStatus) <= 6){
		connection.query('INSERT INTO Patients (PatientStatus, HospitalID, WaitTimeStart) VALUES ('
							 + req.body.PatientStatus
							 + ", " 
							 + req.params.HospitalID
							 + ", '"
							 + getFormattedDate()
							 + "');", 
							 function (err, rows, fields) {
		  	if (err) throw err
		  	console.log("PUT hospital admin page (admitting):\n\n")
	  		console.log(req.params.HospitalID)
	  		response.redirect('/' + req.params.HospitalID);
		})
	}

	// Remove patient from queue
	else if (parseInt(req.body.PatientStatus) <= 12){
		console.log("Trying to remove!");
		connection.query('UPDATE Patients SET WaitTimeEnd = "'
										 + getFormattedDate()
										 + '" WHERE PatientID = '
										 + req.body.PatientID
										 + ";", 
										 function (err, rows, fields) {
		  	if (err) throw err
		  	console.log("POST hospital admin page (treating):\n\n")
	  		console.log(req.params.HospitalID)	
	  		response.redirect('/' + req.params.HospitalID);
		})
	}

	// Delete patient from system
	else {
		connection.query('UPDATE Patients SET Deleted = True WHERE PatientID = '
										 + req.body.PatientID
										 + ";", 
										 function (err, rows, fields) {
		  	if (err) throw err
		  	console.log("POST hospital admin page (deleting):\n\n")
	  		console.log(req.params.HospitalID)	
	  		response.redirect('/' + req.params.HospitalID);
		  	// response.render('admin', { hospitalID: req.params.HospitalID });
		})
	}

	// Update Log
	if (parseInt(req.body.PatientStatus) <= 6){
		connection.query('SELECT * FROM Patients ORDER BY PatientID DESC LIMIT 1;', function (err, rows0, fields0){
			var ID = rows0[0].PatientID;

			console.log('INSERT INTO ActivityLog (PatientID, PreviousState, NewState, LogTime, UndoAction, HospitalID) VALUES ('
                       + ID
                       + ', "N", "A", "'
                       + getFormattedDate()
                       + '", False, ',
                       + req.params.HospitalID
                       + ');')

			connection.query('INSERT INTO ActivityLog (PatientID, PreviousState, NewState, LogTime, UndoAction, HospitalID) VALUES ('
                       + ID
                       + ', "N", "A", "'
                       + getFormattedDate()
                       + '", False);',
						function (err, rows1, fields1){
							console.log("Updated Log: Patient Added to Queue");
						})
		})
	}
	else if (parseInt(req.body.PatientStatus) <= 12){
		var ID = req.body.PatientID;
		connection.query('INSERT INTO ActivityLog (PatientID, PreviousState, NewState, LogTime, UndoAction) VALUES ('
                       + ID
                       + ', "A", "R", "'
                       + getFormattedDate()
                       + '", False, ',
                       + req.params.HospitalID
                       + ');',
						function (err, rows, fields){
							console.log("Updated Log: Removed Patient from Queue");
						})
	}
	else if (parseInt(req.body.PatientStatus) <= 18){
		var ID = req.body.PatientID;
		connection.query('INSERT INTO ActivityLog (PatientID, PreviousState, NewState, LogTime, UndoAction) VALUES ('
                       + ID
                       + ', "A", "D", "'
                       + getFormattedDate()
                       + '", False, ',
                       + req.params.HospitalID
                       + ');',
						function (err, rows, fields){
							console.log("Updated Log: Deleted Patient From System");
						})
	}
});


function calculateTimes(rows){
	for(var i = 0; i < rows.length; i++){
		rows[i]["EchoTime"] = rows[i]["EchoPatients"]*rows[i]["EchoRate"]
	  	rows[i]["DeltaTime"] = rows[i]["DeltaPatients"]*rows[i]["DeltaRate"] + rows[i]["EchoTime"]
	  	rows[i]["CharlieTime"] = rows[i]["CharliePatients"]*rows[i]["CharlieRate"] + rows[i]["DeltaTime"]
	  	rows[i]["BravoTime"] = rows[i]["BravoPatients"]*rows[i]["BravoRate"] + rows[i]["CharlieTime"]
	  	rows[i]["AlphaTime"] = rows[i]["AlphaPatients"]*rows[i]["AlphaRate"] + rows[i]["BravoTime"]
	  	rows[i]["OmegaTime"] = rows[i]["OmegaPatients"]*rows[i]["OmegaRate"] + rows[i]["AlphaTime"]
	  	rows[i]["SAWTime"] = (rows[i]["OmegaTime"]*OMEGARATE + rows[i]["AlphaTime"]*ALPHARATE + rows[i]["BravoTime"]*BRAVORATE
	  						  + rows[i]["CharlieTime"]*CHARLIERATE + rows[i]["DeltaTime"]*DELTARATE + rows[i]["EchoTime"]*ECHORATE) / NORMALIZER
	  	rows[i]["TotalPatients"] = rows[i]["OmegaPatients"] + rows[i]["AlphaPatients"] + rows[i]["BravoPatients"]
	  							   + rows[i]["CharliePatients"] + rows[i]["DeltaPatients"] + rows[i]["EchoPatients"]
	}
}

function getFormattedDate(){
    var d = new Date();

    d = d.getFullYear() + "-" + ('0' + (d.getMonth() + 1)).slice(-2) + "-" + ('0' + d.getDate()).slice(-2) + " " + ('0' + d.getHours()).slice(-2) + ":" + ('0' + d.getMinutes()).slice(-2) + ":" + ('0' + d.getSeconds()).slice(-2);

    return d;
}

module.exports = router;
