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
var connection = mysql.createPool({
    connectionLimit : 1000,
    connectTimeout  : 60 * 60 * 1000,
    aquireTimeout   : 60 * 60 * 1000,
    timeout         : 60 * 60 * 1000,    
    canRetry: true,
    port: 3306,
    connectionLimit: 9,
    waitForConnections: true,
    queueLimit: 0,
  	host: 'us-cdbr-iron-east-04.cleardb.net',
  	user: 'b2718b3ac5712e',
  	password: '4a8fad2c',
  	database: 'heroku_5aad6cee4f2d147'    
});

console.log("Connected!");

connection.query('USE heroku_5aad6cee4f2d147;', function (err, rows, fields) {
  	if(err) throw err
  	console.log('Using heroku_5aad6cee4f2d147 DB.')
})


// GET home page.
router.get('/', function (req, res, next) {
	var response = res;
	if(req.query.valid == "false") console.log("invalid!")
	connection.query('SELECT * FROM WaitingRooms;', function (err, rows, fields) {
		if(err) throw err
	  	calculateTimes(rows);
	    var categories = {"omega": [], "alpha": [], "bravo": [], "charlie": [], "delta": [], "echo": [] };

	    for(var hospital in rows){
	    	categories["omega"].push({ "name": rows[hospital].HospitalName, "time": rows[hospital].OmegaTime});
	    	categories["alpha"].push({ "name": rows[hospital].HospitalName, "time": rows[hospital].AlphaTime});
	    	categories["bravo"].push({ "name": rows[hospital].HospitalName, "time": rows[hospital].BravoTime});
	    	categories["charlie"].push({ "name": rows[hospital].HospitalName, "time": rows[hospital].CharlieTime});
	    	categories["delta"].push({ "name": rows[hospital].HospitalName, "time": rows[hospital].DeltaTime});
	    	categories["echo"].push({ "name": rows[hospital].HospitalName, "time": rows[hospital].EchoTime});
	    }

	    for(var category in categories){
	    	categories[category].sort(function(a,b) {return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0);}); 
	    }
	  	console.log("GET home page:\n")
	  	response.render('index', { data: rows, categories: categories });
  	});
});  


// GET hospital admin page.
router.get('/:HospitalID', function (req, res, next) {
	var response = res;

	// Check if valid hospital ID
	connection.query('SELECT * FROM WaitingRooms WHERE HospitalID = "' + req.params.HospitalID + '";', function (err0, rows0, fields0){
		if(err0) throw err0
		if (rows0[0] == undefined){
			// If we get back undefined rows, then the hospital ID was invalid
  			response.redirect('/?valid=false');
  			return;
		}
		connection.query('SELECT PatientID AS PatientID, PatientStatus AS PatientStatus, HospitalID AS HospitalID, COALESCE(DATE_FORMAT(WaitTimeStart, "%H:%i"), "-1") AS WaitTimeStart, COALESCE(DATE_FORMAT(WaitTimeEnd, "%H:%i"), "Click to discharge") AS WaitTimeEnd FROM Patients WHERE HospitalID = "' + req.params.HospitalID + '" AND WaitTimeEnd IS NULL AND Deleted = False ORDER BY PatientID DESC;', function (err1, rows1, fields1){
			if(err1) throw err1
			console.log("GET hospital admin page:\n")
		  	connection.query('SELECT LogID AS LogID, PatientID AS PatientID, PreviousState AS PreviousState, NewState AS NewState, COALESCE(DATE_FORMAT(LogTime, "%H:%i"), "-1") AS LogTime, UndoAction AS UndoAction, HospitalID AS HospitalID FROM ActivityLog WHERE HospitalID = ' + req.params.HospitalID + ' AND UndoAction = False ORDER BY LogID DESC LIMIT 3;', function (logerr, logrows, logfields){
				if(logerr) throw logerr
		  		console.log("SENT LOG DATA:\n");
				response.render('admin', { HospitalName: rows0[0]["HospitalName"], patients: rows1, LogData: logrows });
		  	})
		});
	});
});


// POST hospital admin page.
router.post('/:HospitalID', function (req, res, next) {
	console.log("POST request")
	console.log("Hosptial ID: " + req.params.HospitalID)
	var response = res;

	// Check if valid hospital ID
	// Fix this
	connection.query('SELECT * FROM WaitingRooms WHERE HospitalID = "' + req.params.HospitalID + '";', function (err, rows, fields){
		if(err) throw err
	});


	// UNDO
	if (parseInt(req.body.PatientStatus) == 18){
		console.log("Undo detected!");
		console.log('SELECT * FROM ActivityLog WHERE LogID = ' + req.body.LogID + ';');
		// Look up LogID in ActivityLog
		connection.query('SELECT * FROM ActivityLog WHERE LogID = ' + req.body.LogID + ';', function (err, rows, fields){
			if(err) throw err
			console.log("Looked up ActivityLog");
			connection.query('SELECT * FROM Patients WHERE PatientID = ' + rows[0].PatientID + ';', function (err0, rows0, fields0){
				if(err0) throw err0
				console.log("Looked up Patients");

				// Undoing the action of adding a patient to the queue who previously did not exist in the system
				if(rows[0].NewState == "A"){
					connection.query("UPDATE Patients SET Deleted=True WHERE PatientID=" + rows[0].PatientID + ";", function (err, rows, fields){
						if(err) throw err
						console.log("Updated Patient table")
						var token;
						if(rows0[0].PatientStatus == 1){
							token = "Omega";
						}
						else if(rows0[0].PatientStatus == 2){
							token = "Alpha";
						}
						else if(rows0[0].PatientStatus == 3){
							token = "Bravo";
						}					
						else if(rows0[0].PatientStatus == 4){
							token = "Charlie";
						}
						else if(rows0[0].PatientStatus == 5){
							token = "Delta";
						}
						else if(rows0[0].PatientStatus == 6){
							token = "Echo";
						}

						connection.query("UPDATE WaitingRooms SET " + token + "Patients = " + token + "Patients - 1 WHERE HospitalID = " + req.params.HospitalID + ";", function (err, rows, fields){
							if(err) throw err
							console.log("Updated WaitingRooms table")
							connection.query("UPDATE ActivityLog SET UndoAction = True WHERE LogID = " + req.body.LogID + ";", function (err, rows, fields){
								if(err) throw err
								console.log("Updated ActivityLog table");
								response.redirect('/' + req.params.HospitalID);
							});																	
						});				
					});		
				}

				// Undoing the action of removing a patient from the queue i.e. putting the patient back in the queue as they were before they were removed
				if(rows[0].NewState == "R"){
					connection.query("UPDATE Patients SET WaitTimeEnd=NULL WHERE PatientID=" + rows[0].PatientID + ";", function (err, rows, fields){
						if(err) throw err
						console.log("Updated Patient table")
						var token;
						if(rows0[0].PatientStatus == 1){
							token = "Omega";
						}
						else if(rows0[0].PatientStatus == 2){
							token = "Alpha";
						}
						else if(rows0[0].PatientStatus == 3){
							token = "Bravo";
						}					
						else if(rows0[0].PatientStatus == 4){
							token = "Charlie";
						}
						else if(rows0[0].PatientStatus == 5){
							token = "Delta";
						}
						else if(rows0[0].PatientStatus == 6){
							token = "Echo";
						}

						connection.query("UPDATE WaitingRooms SET " + token + "Patients = " + token + "Patients + 1 WHERE HospitalID = " + req.params.HospitalID + ";", function (err, rows, fields){
							if(err) throw err
							console.log("Updated WaitingRooms table")
							connection.query("UPDATE ActivityLog SET UndoAction = True WHERE LogID = " + req.body.LogID + ";", function (err, rows, fields){
								if(err) throw err
								console.log("Updated ActivityLog table");
								response.redirect('/' + req.params.HospitalID);
							});																	
						});				
					});		
				}

				// Undoing the action of Deleting a patient from the system when they were in the queue
				if(rows[0].NewState == "D"){
					connection.query("UPDATE Patients SET Deleted=False WHERE PatientID=" + rows[0].PatientID + ";", function (err, rows, fields){
						if(err) throw err
						console.log("Updated Patient table")
						var token;
						if(rows0[0].PatientStatus == 1){
							token = "Omega";
						}
						else if(rows0[0].PatientStatus == 2){
							token = "Alpha";
						}
						else if(rows0[0].PatientStatus == 3){
							token = "Bravo";
						}					
						else if(rows0[0].PatientStatus == 4){
							token = "Charlie";
						}
						else if(rows0[0].PatientStatus == 5){
							token = "Delta";
						}
						else if(rows0[0].PatientStatus == 6){
							token = "Echo";
						}

						connection.query("UPDATE WaitingRooms SET " + token + "Patients = " + token + "Patients + 1 WHERE HospitalID = " + req.params.HospitalID + ";", function (err, rows, fields){
							if(err) throw err
							console.log("Updated WaitingRooms table")
							connection.query("UPDATE ActivityLog SET UndoAction = True WHERE LogID = " + req.body.LogID + ";", function (err, rows, fields){
								if(err) throw err
								console.log("Updated ActivityLog table");
								response.redirect('/' + req.params.HospitalID);
							});																	
						});				
					});		
				}
			});
		});
	}

	// NOT UNDO
	else{
	    // Check if admitting or treating (or deleting)
		if (parseInt(req.body.PatientStatus) <= 6){
			var incrementValue = 1
		}
		else {
			var incrementValue = -1
		}

		// Check what MySQL token is needed based on Patient urgency category (except for undoing)
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
	    console.log("UPDATE WaitingRooms SET " + token + incrementValue + " WHERE HospitalID = " + req.params.HospitalID + ";");
	    connection.query("UPDATE WaitingRooms SET " + token + incrementValue + " WHERE HospitalID = " + req.params.HospitalID + ";", function (err, rows, fields){
			if(err) throw err					 	
		});

		// Add new patient to queue
		if (parseInt(req.body.PatientStatus) <= 6){
			connection.query('INSERT INTO Patients (PatientStatus, HospitalID, WaitTimeStart) VALUES (' + req.body.PatientStatus + ", " + req.params.HospitalID + ", '" + getFormattedDate() + "');", function (err, rows, fields) {
				if(err) throw err
				connection.query('SELECT * FROM Patients ORDER BY PatientID DESC;', function (err0, rows0, fields0){
					if(err0) throw err0
					connection.query('INSERT INTO ActivityLog SET PatientID = '+ rows0[0].PatientID + ', PreviousState = "N", NewState = "A", LogTime = "' + getFormattedDate() + '", UndoAction = False, HospitalID = ' + req.params.HospitalID +';', function (err1, rows1, fields1){
					if(err1) throw err1
				  		response.redirect('/' + req.params.HospitalID);
					})								
				})
			})	
		}

		// Remove patient from queue
		else if (parseInt(req.body.PatientStatus) <= 12){
			connection.query('UPDATE Patients SET WaitTimeEnd = "' + getFormattedDate() + '" WHERE PatientID = ' + req.body.PatientID + ";", function (err, rows, fields) {
				if(err) throw err
			  	connection.query('INSERT INTO ActivityLog SET PatientID = '+ req.body.PatientID + ', PreviousState = "A", NewState = "R", LogTime = "' + getFormattedDate() + '", UndoAction = False, HospitalID = ' + req.params.HospitalID +';', function (err1, rows1, fields1){
					if(err1) throw err1
		  			response.redirect('/' + req.params.HospitalID);
		  		})
			})
		}

		// Delete patient from system
		else {
			connection.query('UPDATE Patients SET Deleted = True WHERE PatientID = ' + req.body.PatientID + ";", function (err, rows, fields) {
				if(err) throw err
		  		connection.query('INSERT INTO ActivityLog SET PatientID = '+ req.body.PatientID + ', PreviousState = "A", NewState = "D", LogTime = "' + getFormattedDate() + '", UndoAction = False, HospitalID = ' + req.params.HospitalID +';', function (err1, rows1, fields1){
					if(err1) throw err1
		  			response.redirect('/' + req.params.HospitalID);
		  		})
			})
		}
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
	  	rows[i]["SAWTime"] = (rows[i]["OmegaTime"]*OMEGARATE + rows[i]["AlphaTime"]*ALPHARATE + rows[i]["BravoTime"]*BRAVORATE + rows[i]["CharlieTime"]*CHARLIERATE + rows[i]["DeltaTime"]*DELTARATE + rows[i]["EchoTime"]*ECHORATE) / NORMALIZER
	  	rows[i]["TotalPatients"] = rows[i]["OmegaPatients"] + rows[i]["AlphaPatients"] + rows[i]["BravoPatients"] + rows[i]["CharliePatients"] + rows[i]["DeltaPatients"] + rows[i]["EchoPatients"]
	}
}

function getFormattedDate(){
    var d = new Date();
    d = d.getFullYear() + "-" + ('0' + (d.getMonth() + 1)).slice(-2) + "-" + ('0' + d.getDate()).slice(-2) + " " + ('0' + d.getHours()).slice(-2) + ":" + ('0' + d.getMinutes()).slice(-2) + ":" + ('0' + d.getSeconds()).slice(-2);
    return d;
}

module.exports = router;
