// TODO: Continue working on the tooltips on Handlers
// TODO: Naming is a mess. "ReloadChart", "RedrawChart", etc.
// TODO: LoadData should now load both? maybe?

//TODO: functions are getting mangled together, write clear responsibilities, dependencies, and "call chains" for actions.
//TODO: find a better way to organize the layout, especially the header (load data button, various option checklists)	

// Constants for visualization mode
var VISUALIZATION_CHAINS = 0;
var VISUALIZATION_PLLC = 1;

JacobianChart = function(plot_elemid, filterlist_elemid, header_elemid, selection_elemid, 
								options){
	var self = this;
	this.chart = document.getElementById(plot_elemid);
	this.header = document.getElementById(header_elemid);
	this.filterList = document.getElementById(filterlist_elemid);
	this.selectionInfo = document.getElementById(selection_elemid);
	this.activeFilters = new Set();

	this.selectedEdge = null;
	this.selectedCorner = null;
	this.currentEdges = [];
	this.currentCorners = [];
	this.currentPrimitiveCorners = [];
	this.currentPLLC = new Set();
	this.currentFilters = [];

	this.loadingData = false;
	this.hideEmptyEdges = true;

	this.options = options || {};
	this.totalWidth = this.chart.clientWidth;
	this.totalHeight = this.chart.clientHeight;
	var xmin = this.options.xmin || 0;
	var ymin = this.options.ymin || 0;
	var xmax = this.options.xmax || 30;
	var ymax = this.options.ymax || 30;
	this.tickNum = this.options.tickNum || 30;

	this.padding = {
		"top":    10, 
		"right":  30,
		"bottom": 45,
		"left":   45
	};

	this.width = this.totalWidth - this.padding.left - this.padding.right;
	this.height = this.totalHeight - this.padding.top - this.padding.bottom;

	// Initialize scales
	this.xScale = d3.scale.linear()
		.domain([xmin, xmax])
		.range([0,this.width]);

	this.yScale = d3.scale.linear()
		.domain([ymax, ymin])
		.nice()
		.range([0, this.height])
		.nice();


	// Interaction logic
	this.downx = Math.NaN;
	this.downy = Math.NaN;
	this.selectedPrimitive = null;
	this.mouseover_primitive = null;


	// General view, represents the full chart
	this.view = d3.select(this.chart).append("svg")
		.attr("width",  this.totalWidth)
		.attr("height", this.totalHeight);

	// Represents the background rectangle
	this.background = this.view.append("rect")
		.attr("transform", "translate(" + this.padding.left + "," + this.padding.top + ")")
		.attr("width", this.width)
		.attr("height", this.height)
		.style("fill", "#EEEEEE")
		.attr("pointer-events", "all")
		.on("mousedown.drag", self.plot_drag())
		.on("touchstart.drag", self.plot_drag())
		this.background.call(d3.behavior.zoom().x(self.xScale).y(self.yScale).on("zoom", self.redrawChart()));

  // Represents the axis and line space in front of the background
  this.linespace = this.view.append("svg")
    .attr("width", this.totalWidth)
    .attr("height", this.totalHeight)

  // Represents the foreground: points and lines
  this.plot = this.view.append("g")
    .attr("transform", "translate(" + this.padding.left + "," + this.padding.top + ")")
    .append("svg")
    .attr("width", this.width)
    .attr("height", this.height)
    .attr("viewBox", "0 0 "+this.width+" "+this.height);

  this.edgeSvg = this.plot.append("svg");
  this.primitiveSvg = this.plot.append("svg");
  this.possibleEdgeEndSvg = this.plot.append("svg");

	// Represents the tooltips
	this.tooltips = d3.select(this.chart).append("div")
		.attr("class", "tooltip")
		.style("display", "none")
		.style("opacity", 0);

  d3.select(this.chart)
    .on("mousemove.drag", self.mousemove())
    .on("touchmove.drag", self.mousemove())
    .on("mouseup.drag",   self.mouseup())
    .on("touchend.drag",  self.mouseup());

	document.getElementById("loadDataButton").onclick = function(){ 
		self.load_data()(document.getElementById("loadDataInput").value ? document.getElementById("loadDataInput").value : 0);
	};

	document.getElementById("hideEdgeCheckbox").addEventListener('change', function(event) {
		if (this.checked) self.hideEmptyEdges = true; 
		else self.hideEmptyEdges = false;
		self.updateEdges()();
	});
	
	document.getElementById("modeSelector").onchange = function(){
		self.visualizationMode = document.getElementById("modeSelector").selectedIndex;
		self.reloadChart()();
	}
	this.visualizationMode = document.getElementById("modeSelector").selectedIndex;
  	this.data = [];
	self.redrawChart()();
};


	
JacobianChart.prototype.isMouseover = function(p){
  var self = this;
  return (self.mouseover_primitive != null && p.x == self.mouseover_primitive.x && p.y == self.mouseover_primitive.y);
}


JacobianChart.prototype.load_data = function(){
	var self = this;
	return function(maxdeg){
		if (!self.loadingData){
			self.loadingData = true;
			document.getElementById("loadIcon").style.display = 'inline-block';
			GetJacobianDataCSV(maxdeg, self.onDataLoaded());
		}	
	}
}

JacobianChart.prototype.onDataLoaded = function(){
	var self = this;
	return function(jacobianData){
		document.getElementById("loadIcon").style.display = 'none';
		self.loadingData = false;
		self.data = jacobianData;
		self.reloadChart()();
	}
}

JacobianChart.prototype.reloadChart = function(){
	var self = this;
	return function(){
		self.clearChart()();
		if (self.visualizationMode == VISUALIZATION_CHAINS) {
			self.currentFilters = self.data.filters;
			self.redrawFilterList()();
			self.refresh_filtered_data()();
		}
		else if (self.visualizationMode == VISUALIZATION_PLLC){
			for (var p in self.data.pllc) self.currentPLLC.add(self.data.pllc[p]);
			self.redrawChart()();
		}
	}
}


JacobianChart.prototype.clearChart = function(){
	var self = this;
	return function(){
		self.selectedCorner = null;
		self.selectedEdge = null;
		self.currentCorners = [];
		self.currentEdges = [];
		self.currentPLLC.clear();
		self.currentFilters = [];
		self.currentPrimitiveCorners = [];

		self.redrawFilterList()();
		self.redrawChart()();
	}
}


JacobianChart.prototype.refresh_filtered_data = function(){	
	var self = this;
	return function() {
		self.currentPrimitiveCorners = self.data.primitive_corners.filter(self.passesFilters());
		
		if ((self.selectedCorner != null && !self.passesFilters()(self.selectedCorner)) ||
			(self.selectedEdge != null && !self.passesFilters(self.selectedEdge.corner)) ){
			self.selectedCorner = null;
			self.selectedEdge = null;
			self.currentCorners = [];
			self.currentEdges = [];
		}
		if (self.selectedEdge != null) {
			self.selectedEdge.nextCorners.forEach(function(c) { 
					if (self.passesFilters()(c)) self.currentCorners.push(c); 
			});
		}
		self.currentCorners = self.currentCorners.filter(self.passesFilters());

		self.redrawChart()();
	}
}

JacobianChart.prototype.is_visible = function(){
  var self = this;
  return function(p) {
    return (p.x / p.l) >= Math.ceil(d3.min(self.xScale.domain())) && (p.x / p.l ) <= Math.floor(d3.max(self.xScale.domain())) && p.y >= Math.ceil(d3.min(self.yScale.domain())) && p.y <= Math.floor(d3.max(self.yScale.domain()));
  }
}



JacobianChart.prototype.passesFilters = function(){
  var self = this;
  return function(corner) {
    var passes = true;
    self.activeFilters.forEach( function(filter) {
      if ( !corner.passesFilter[filter.id]) passes = false;
    });
    return passes;
  }
}


JacobianChart.prototype.redrawFilterList = function() {
	var self = this;

	return function() {
		self.activeFilters.clear();
		self.filterList.innerHTML = "";
		for (var filterid in self.currentFilters) {
			if (self.currentFilters.hasOwnProperty(filterid)){
				var filter = self.currentFilters[filterid];

				var label = document.createElement("div");

				label.style.paddingTop = "20px";

				var filtername = document.createTextNode(filter.name);
				var descdiv = document.createElement("div");
				var filterdesc = document.createTextNode(filter.description);
				var checkbox = document.createElement("input");

				checkbox.type = "checkbox";
				checkbox.name = "filter" + filter.id;
				checkbox.value = filter;
				checkbox.filter = filter;

				checkbox.addEventListener('change', function(event) {
					if (this.checked) {
						self.activeFilters.add(this.filter);
						self.refresh_filtered_data()();
					}
					else {
						self.activeFilters.delete(this.filter);
						self.refresh_filtered_data()();
					}
					self.updatePoints();
				});

				label.appendChild(checkbox);
				label.appendChild(filtername);

				descdiv.appendChild(filterdesc);
				label.appendChild(descdiv);

				self.filterList.appendChild(label);
			}
		}
	}
}

arrayHas = function(a, obj) {
    var i = a.length;
    while (i--) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
}
