// TODO: Way to read only the necessary data (everything below maxdeg, and only accessible through
// corners below maxdeg).

GetPossibleA0Primes = function(maxdeg){
  var possible_a0_primes;
  jQuery.ajax({
    type: 'GET',
    url: 'database_A0prime.php',
    dataType: 'json',
    data: { maxdeg: maxdeg },
        success: function (data, textstatus, jqXHR) {
      if( !('error' in data) ) {
        data.edge_ends.forEach( function(e) {
          e.x = +e.x;
          e.y = +e.y;
          e.p = +e.p;
          e.o = +e.o;
          e.r = +e.r;
          e.s = +e.s;
		  });
        possible_a0_primes = data.edge_ends;
      }
      else {
        console.log('database.php error: ' + data.error);
      }
    },

    timeout: 10000,

    error: function(x,t,m) {
      console.debug(x, t, m);
    }

  });
  return possible_a0_primes;
}

GetPossibleA0PrimesCSV = function(maxdeg, onDataLoaded){
	var possible_a0_primes = new Array();

	var onFileRead = function(data, filename){
		data.forEach( function(dbA0p) {
			var a0p = new PossibleA0p(dbA0p);
			if (a0p.x + a0p.y <= maxdeg) possible_a0_primes.push(a0p);
		});
		onDataLoaded(possible_a0_primes);
	}

	ReadCSV(maxdeg, 'possibleA0p.csv', onFileRead);
}


// Returns the database data for all corners with (x + y < maxdeg). The structure is as follows:
//
// JacobianData{
// 	Corner[] primitive_corners;	// Array
//		Corner[] corners; 				// Access by corner_id
//		Edge[] edges;						// Access by edge_id
//		Filter[] filters;				   // Access by filter_id
// }
//
// Edge{
//		int id;
//		Corner corner;
//		int x, y, l;
//		int r, s;
//		int f1, f2, rho, sig;
//		bool hasChildren;
//		Corner[] nextCorners; // Array
// }
//
// MNFamily{
// 	int m, n, dm, dn;
// }
// 
// Corner{
//		int id;
//		int parentId;
//		Edge parentEdge;
//		int x, y, l;
//		bool isType1, isType2;
//		bool[] passesFilter; // Access by filter_id
//		Edge[] edges;			// Array
//		int activeParentEdges;
//    MNFamily[] mnFamilies;
// }
//
// Filter{
//		int id;
//		string name;
//		string description;
// }
//
// PossibleA0p {
//		int x, y;
//		int rho, sig;
// 	int r, s;
// }

function PossibleA0p (dbA0p){
	this.x = +dbA0p.a;
	this.y = +dbA0p.b;
	this.rho = +dbA0p.rho;
	this.sig = +dbA0p.sig;
	this.r = +dbA0p.r;
	this.s = +dbA0p.s;
}

function Corner (dbCorner){
	this.id = +dbCorner.id;
	this.parentId = +dbCorner.parent_id;
	this.x = +dbCorner.a;
	this.l = +dbCorner.l;
	this.y = +dbCorner.b;
	this.isType1 = (dbCorner.is_type_1 == "t") || (dbCorner.is_type_1 == "1");
	this.isType2 = (dbCorner.is_type_2 == "t") || (dbCorner.is_type_2 == "1");
	this.passesFilter = {};
	this.edges = new Array();
	this.mnFamilies = new Array();
	this.activeParentEdges = 0;
	this.tooltipKeys = ["x", "l", "y", "isType1", "isType2", "mnFamilies"];
}

function MNFamily (dbMN){
	this.corner_id = +dbMN.corner_id;
	this.m = +dbMN.m;
	this.n = +dbMN.n;
	this.dm = +dbMN.dm;
	this.dn = +dbMN.dn;
}

MNFamily.prototype.toString = function(){
	return "(" + this.m + " + " + this.dm + "t, " + this.n + " + " + this.dn + "t)";
}


Corner.prototype.toString = function()
{
	return "(" + this.x + (this.l == 1? "" : "/" + this.l) + ", " + this.y + ")";
}

Corner.prototype.degree = function()
{
	return this.x / this.l + this.y;
}

function Edge (dbEdge){
	this.id = +dbEdge.id;
	this.corner_id = +dbEdge.corner_id;
	this.x = +dbEdge.a;
	this.l = +dbEdge.l;
	this.y = +dbEdge.b;
	this.r = +dbEdge.r;
	this.s = +dbEdge.s;
	this.f1 = +dbEdge.f1;
	this.f2 = +dbEdge.f2;
	this.rho = +dbEdge.rho;
	this.sig = +dbEdge.sig;
	this.nextCorners = new Array();
	this.tooltipKeys = ["x", "l", "y", "r", "s", "f1", "f2", "rho", "sig"];
}

Edge.prototype.toString = function()
{
	return this.corner.toString() + "-->" + "(" + this.r + (this.l == 1? "" : "/" + this.l) + ", " + this.s + ")";
}

ReadCSV = function(maxdeg, filename, onFileRead){
	var data;
	var rawFile = new XMLHttpRequest();
	rawFile.onreadystatechange = function ()
	{
		if(rawFile.readyState === 4) {
			if (rawFile.status === 200 || rawFile.status == 0){
				var text = rawFile.responseText;
				var lines = text.split(/\r\n|\n/);
				var headers = lines[0].split(',');
				data = new Array();
				for (var i=1; i<lines.length; i++) {
					var row = lines[i].split(',');
					if (row.length == headers.length) {
						var datarow = [];
						for (var j=0; j<headers.length; j++) {
							 datarow[headers[j]] = row[j];
						}
						data.push(datarow);
					}
				}
				onFileRead(data, filename);
			}
			else{
				console.log("Error opening file: " + filename);
			}
		}
	}
	rawFile.open("GET", filename, true);
	rawFile.send(null);
};


GetJacobianDataCSV = function(maxdeg, onDataLoaded){
	var edges = {};
	var corners = {};
	var primitive_corners = new Array();

	var waitingFiles = new Set();
	waitingFiles.add('corner.csv');
	waitingFiles.add('edge.csv');
	waitingFiles.add('corner_filter.csv');
	waitingFiles.add('filter.csv');
	waitingFiles.add('possibleA0p.csv');
	waitingFiles.add('chains.csv');
	
	var data = {};

	var onFileRead = function(partialData, filename){
		data[filename] = partialData;
		waitingFiles.delete(filename);
		if (waitingFiles.size == 0){
			var edges = {};
			var corners = {};
			var primitive_corners = new Array();
			var pllc = new Array();
		
			data['possibleA0p.csv'].forEach( function(dbA0p) {
				var a0p = new PossibleA0p(dbA0p);
				if (a0p.x + a0p.y <= maxdeg) pllc.push(a0p);
			});

			data['corner.csv'].forEach( function(dbCorner) {
				corner = new Corner(dbCorner);
				if (corner.degree() <= maxdeg){
					corners[corner.id] = corner;
					if (corner.parentId == -1) primitive_corners.push(corner);
				}
			});

			data['edge.csv'].forEach( function(dbEdge) {
				edge = new Edge(dbEdge);
				if (edge.corner_id in corners) {
					edge.corner = corners[edge.corner_id];
					edges[edge.id] = edge;
					corners[edge.corner_id].edges.push(edge);
				}	
			});

			data['corner_filter.csv'].forEach( function(cf) {
				cf.corner_id = +cf.corner_id;
				cf.filter_id = +cf.filter_id;
				if (cf.corner_id in corners) {
					corners[cf.corner_id].passesFilter[cf.filter_id] = (cf.passes == "t") || (cf.passes == "1");
				}
			});

			data['chains.csv'].forEach( function(dbMN) {
				mn = new MNFamily(dbMN);
				if (mn.corner_id in corners){
					corners[mn.corner_id].mnFamilies.push(mn);
				}
			});

			for (var key in corners){
				corner = corners[key];
				if (corner.parentId != -1 && corner.parentId in edges) {
					corner.parentEdge = edges[corner.parentId];
					edges[corner.parentId].nextCorners.push(corner);
					edges[corner.parentId].hasChildren = true;
				}
			}

			data['filter.csv'].forEach( function(f) { f.id = +f.id; } );
			data['filter.csv'].sort( function(f1, f2) { return f1.id - f2.id } );

			var jacobianData = {};
			jacobianData.primitive_corners = primitive_corners;
			jacobianData.corners = corners;
			jacobianData.edges = edges;
			jacobianData.filters = data['filter.csv'];
			jacobianData.pllc = pllc;
			onDataLoaded(jacobianData);
		}
	}

	ReadCSV(maxdeg, 'corner.csv', onFileRead);
	ReadCSV(maxdeg, 'edge.csv', onFileRead);
	ReadCSV(maxdeg, 'corner_filter.csv', onFileRead);
	ReadCSV(maxdeg, 'filter.csv', onFileRead);
	ReadCSV(maxdeg, 'possibleA0p.csv', onFileRead);
	ReadCSV(maxdeg, 'chains.csv', onFileRead);
}

// Obsolete? Check and update.
GetJacobianData = function(maxdeg){
	var jacobianData = {};
  jQuery.ajax({
    type: 'POST',
    url: 'database.php',
    dataType: 'json',
    data: { maxdeg: maxdeg },

    success: function (data, textstatus, jqXHR) {
      if( !('error' in data) ) {
			

        var edges = {};
		  var corners = {};
		  var primitive_corners = new Array();

        data.corners.forEach( function(dbCorner) {
				corner = new Corner(dbCorner);
				corners[corner.id] = corner;
				if (corner.parentId == -1) primitive_corners.push(corner);
		  });

        data.edges.forEach( function(dbEdge) {
				edge = new Edge(dbEdge);
				edge.corner = corners[edge.corner_id];
				edges[edge.id] = edge;
				corners[edge.corner_id].edges.push(edge);
		  });

        data.corner_filters.forEach( function(cf) {
          cf.corner_id = +cf.corner_id;
          cf.filter_id = +cf.filter_id;
			 if (cf.corner_id in corners) {
			 	corners[cf.corner_id].passesFilter[cf.filter_id] = (cf.passes == "t") || (cf.passes == "1");
			 }
        });

			for (var key in corners){
				corner = corners[key];
				if (corner.parentId != -1 && corner.parentId in edges) {
					corner.parentEdge = edges[corner.parentId];
					edges[corner.parentId].nextCorners.push(corner);
					edges[corner.parentId].hasChildren = true;
				}
			}

        data.filters.forEach( function(f) { f.id = +f.id; } );
        data.filters.sort( function(f1, f2) { return f1.id - f2.id } );

		  jacobianData.primitive_corners = primitive_corners;
		  jacobianData.corners = corners;
		  jacobianData.edges = edges;
		  jacobianData.filters = data.filters;
		}
      else {
        console.log('database.php error: ' + data.error);
      }
    },

    timeout: 10000,

    error: function(xml,text,err) {
		console.log("AJAX call error: " + err);
      console.debug(xml, text, err);
    }
  });
  return jacobianData;
};
