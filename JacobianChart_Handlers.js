// Background drag logic
JacobianChart.prototype.plot_drag = function() {
  var self = this;
  return function() {
    d3.select('body').style("cursor", "move");
  }
};


JacobianChart.prototype.isEmpty = function() {
	var self = this;
	return function(e) {
		isEmpty = true;
		e.nextCorners.forEach( function(c) {
		if (self.passesFilters()(c)) isEmpty = false;;
	});
	return isEmpty;
  }
}

JacobianChart.prototype.updateEdges = function() {
	var self = this;
	return function() {
		if (self.selectedCorner != null) {
			self.selectedCorner.edges.forEach( function(e) { 
				if ((!self.hideEmptyEdges || !self.isEmpty()(e)) &&
					!arrayHas(self.currentEdges,e)) self.currentEdges.push(e); 
			});
		}
		if (self.hideEmptyEdges) {
			self.currentEdges = self.currentEdges.filter(function(e){ return !self.isEmpty()(e);});
		}
		self.updatePoints();
	}
}

// Corner selection logic
JacobianChart.prototype.corner_mousedown = function() {
	var self = this;
	return function(c) {
		document.onselectstart = function() { return false; };
		self.currentCorners = [];
		self.currentEdges = [];
		self.selectedEdge = null;
		if (self.selectedCorner == c) {
			self.selectedCorner = null;
		}
		else {
			self.selectedCorner = c;
			c.edges.forEach( function(e) { 
				if (!self.hideEmptyEdges || !self.isEmpty()(e)) {
					self.currentEdges.push(e);
				}
			});
			while (c.parentEdge) {
				self.currentCorners.push(c);
				self.currentEdges.push(c.parentEdge);
				c = c.parentEdge.corner;
			}
			self.currentCorners.push(c);
		}
		self.updatePoints();
	}
}

JacobianChart.prototype.open_tooltip = function() {
	var self = this;
	return function(obj){
		self.tooltips
			.style("display", "initial");
		self.tooltips.transition()
			.duration(200)
			.style("opacity", 0.9);
		self.tooltips.html(self.objectToHTML(obj))
			.style("left", (d3.event.pageX) + "px")
			.style("top", (d3.event.pageY - 28) + "px")
	}
}

JacobianChart.prototype.close_tooltip = function() {
	var self = this;
	return function(obj){
		self.tooltips.transition()
			.duration(500)
			.style("opacity", 0);
	}
}

// Corner mouseover logic
JacobianChart.prototype.corner_mouseover = function() {
	var self = this;
	return function(c) {
		self.open_tooltip()(c);
	}
}

JacobianChart.prototype.corner_mouseout = function() {
	var self = this;
	return function(c) {
		self.close_tooltip()(c);	
	}
}

// Edge selection logic
JacobianChart.prototype.edge_mousedown = function() {
	var self = this;
	return function(e) {
		document.onselectstart = function() { return false; };
		self.currentCorners = [];
		self.currentEdges = [];		
		self.selectedCorner = null;
		if (self.selectedEdge == e) {
			self.selectedEdge = null;
		}
		else{
			self.selectedEdge = e;
			e.nextCorners.forEach( function(c) { 
				if (self.passesFilters()(c)) self.currentCorners.push(c);
			});
			while (e) {
				self.currentEdges.push(e);
				self.currentCorners.push(e.corner);
				e = e.corner.parentEdge;
			}
		}
		self.updatePoints();
	}
}

JacobianChart.prototype.edge_mouseover = function() {
	var self = this;
	return function(e) {
		self.open_tooltip()(e);
	}
}

JacobianChart.prototype.edge_mouseout = function() {
	var self = this;
	return function(e) {
		self.close_tooltip()(e);
	}
}


JacobianChart.prototype.a0p_mouseover = function() {
	var self = this;
	return function(a) {
		self.open_tooltip()(a);
	}
}

JacobianChart.prototype.a0p_mouseout = function() {
	var self = this;
	return function(a) {
		self.close_tooltip()(a);
	}
}


// Transformation logic for axes during plot drag
JacobianChart.prototype.mousemove = function() {
  var self = this;
  return function() {
    var p = d3.mouse(self.view[0][0]),
        t = d3.event.changedTouches;

    if (!isNaN(self.downx)) {
      d3.select('body').style("cursor", "ew-resize");
      var rupx = self.xScale.invert(p[0]),
          xaxis1 = self.xScale.domain()[0],
          xaxis2 = self.xScale.domain()[1],
          xextent = xaxis2 - xaxis1;
      if (rupx != 0) {
        var changex, new_domain;
        changex = self.downx / rupx;
        new_domain = [xaxis1, xaxis1 + (xextent * changex)];
        self.xScale.domain(new_domain);
        self.redrawChart()();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    };
    if (!isNaN(self.downy)) {
      d3.select('body').style("cursor", "ns-resize");
      var rupy = self.yScale.invert(p[1]),
          yaxis1 = self.yScale.domain()[1],
          yaxis2 = self.yScale.domain()[0],
          yextent = yaxis2 - yaxis1;
      if (rupy != 0) {
        var changey, new_domain;
        changey = self.downy / rupy;
        new_domain = [yaxis1 + (yextent * changey), yaxis1];
        self.yScale.domain(new_domain);
        self.redrawChart()();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  }
};



// Logic for mouseup after drag
JacobianChart.prototype.mouseup = function() {
  var self = this;
  return function() {
    document.onselectstart = function() { return true; };
    d3.select('body').style("cursor", "auto");
    d3.select('body').style("cursor", "auto");
    if (!isNaN(self.downx)) {
      self.redrawChart()();
      self.downx = Math.NaN;
      d3.event.preventDefault();
      d3.event.stopPropagation();
    };
    if (!isNaN(self.downy)) {
      self.redrawChart()();
      self.downy = Math.NaN;
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  }
}



JacobianChart.prototype.xaxis_drag = function() {
  var self = this;
  return function(d) {
    document.onselectstart = function() { return false; };
    var p = d3.mouse(self.view[0][0]);
    self.downx = self.xScale.invert(p[0]);
  }
};



JacobianChart.prototype.yaxis_drag = function() {
  var self = this;
  return function(d) {
    document.onselectstart = function() { return false; };
    var p = d3.mouse(self.view[0][0]);
    self.downy = self.yScale.invert(p[1]);
  }
};
