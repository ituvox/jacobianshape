JacobianChart.prototype.objectToHTML = function(obj){
	var div = document.createElement('div');

	var title = document.createElement('h3');
	title.appendChild(document.createTextNode(obj.constructor.name));
	div.appendChild(title);

	var tbl = document.createElement('table');
	tbl.style.width = '100%';
	tbl.setAttribute('border', '1');

	var addKey = function(key){
		if (obj.hasOwnProperty(key)){
			var tr = document.createElement('tr');
			var td1 = document.createElement('td');
			td1.appendChild(document.createTextNode(key));
			tr.appendChild(td1);
			var td2 = document.createElement('td');
			if (key == "passesFilter") {
				var ddiv = document.createElement('div');
				ddiv.innerHTML =this.objectToHTML(obj[key]); 
				td2.appendChild(ddiv);
			}
			else td2.appendChild(document.createTextNode(obj[key]));
			tr.appendChild(td2);
			tbl.appendChild(tr);
		}
	}
	if (obj.tooltipKeys)	for (var i = 0; i < obj.tooltipKeys.length; i++) {
		addKey(obj.tooltipKeys[i]);
	}
	else for (var key in obj) addKey(key);
	div.appendChild(tbl);

	return div.outerHTML;
}

JacobianChart.prototype.redrawChart = function(){
  var self = this;
  return function(){
    var tx = function(d) {
            return "translate(" + (self.padding.left + self.xScale(d)) + "," + self.padding.top + ")";
          },
        ty = function(d) {
            return "translate(" + self.padding.left + "," + (self.padding.top + self.yScale(d)) + ")";
          },
        stroke = function(d) {
            return d ? "#ccc" : "#666";
          },
        fx = self.xScale.tickFormat(self.tickNum),
        fy = self.yScale.tickFormat(self.tickNum);

      // Regenerate x-ticks…
      var gx = self.linespace.selectAll("g.x")
          .data(self.xScale.ticks(self.tickNum), String)
          .attr("transform", tx);

      gx.select("text").text(fx);

      var gxe = gx.enter().insert("g", "a")
          .attr("class", "x")
          .attr("transform", tx);

      gxe.append("line")
          .attr("stroke", stroke)
          .attr("y1", 0)
          .attr("y2", self.height);

      gxe.append("text")
          .attr("class", "axis")
          .attr("y", self.height)
          .attr("dy", "1em")
          .attr("text-anchor", "middle")
          .text(fx)
          .style("cursor", "ew-resize")
          .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
          .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
          .on("mousedown.drag",  self.xaxis_drag())
          .on("touchstart.drag", self.xaxis_drag());


      gx.exit().remove();

      // Regenerate y-ticks…
      var gy = self.linespace.selectAll("g.y")
          .data(self.yScale.ticks(self.tickNum), String)
          .attr("transform", ty);

      gy.select("text")
          .text(fy);

      var gye = gy.enter().insert("g", "a")
          .attr("class", "y")
          .attr("transform", ty)
          .attr("background-fill", "#FFEEB6");

      gye.append("line")
          .attr("stroke", stroke)
          .attr("x1", 0)
          .attr("x2", self.width);

      gye.append("text")
          .attr("class", "axis")
          .attr("x", -3)
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .text(fy)
          .style("cursor", "ns-resize")
          .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
          .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
          .on("mousedown.drag",  self.yaxis_drag())
          .on("touchstart.drag", self.yaxis_drag());


      gy.exit().remove();

      self.background.call(d3.behavior.zoom().x(self.xScale).y(self.yScale).on("zoom", self.redrawChart()));
      self.updateEdges()();
  }
}

// Updates the data
JacobianChart.prototype.updatePoints = function(){
	var self = this;

	var visible_corners = (self.currentCorners.concat(self.currentPrimitiveCorners)).filter(self.is_visible());
	var circ = self.primitiveSvg.selectAll("circle").data(visible_corners);
	var tag = self.primitiveSvg.selectAll("text").data(visible_corners);

	circ.enter().append("circle")
		.on("mousedown",  self.corner_mousedown())
		.on("touchstart", self.corner_mousedown())
		.on("mouseover", self.corner_mouseover())
		.on("mouseout", self.corner_mouseout());
  tag.enter().append("text");
	circ
		.attr("class", function(p) { return p.isType1? "type1Corner" : (self.selectedCorner == p || self.isMouseover(p) ? "selectedPrimitive" : "primitive"); })
		.attr("cx",    function(p) { return self.xScale(p.x / p.l); })
		.attr("cy",    function(p) { return self.yScale(p.y); })
		.attr("r", "5px");
	tag
		.attr("class", "cornerTag")
		.attr("x", function(p) { return 10 + self.xScale(p.x / p.l); })
		.attr("y", function(p) { return 10 + self.yScale(p.y); })
		.attr("visibility", function(p) { return arrayHas(self.currentCorners, p) || self.isMouseover(p) ? "visible" : "hidden"; })
		.text(function(p) { return "(" + p.x + (p.l == 1 ? "" : ( "/" + p.l) ) + "," + p.y + ")" });

	circ.exit().remove();
	tag.exit().remove();


	var edges = Array.from(self.currentEdges);

	var edgeLines = self.edgeSvg.selectAll("line").data(edges);
	var edgeCircles = self.edgeSvg.selectAll("circle").data(edges);
	var edgeTags = self.edgeSvg.selectAll("text").data(edges);


	edgeLines.enter().append("line");
	edgeCircles.enter().append("circle")
		.on("mousedown", self.edge_mousedown())
		.on("touchstart", self.edge_mousedown())
		.on("mouseover", self.edge_mouseover())
		.on("mouseout", self.edge_mouseout());
	edgeTags.enter().append("text");


	edgeLines
		.attr("class", "edgeLine")
		.attr("x1", function(e) { return self.xScale(e.x / e.l); })
		.attr("y1", function(e) { return self.yScale(e.y); })
		.attr("x2", function(e) { return self.xScale(e.r / e.l); })
		.attr("y2", function(e) { return self.yScale(e.s); });
	edgeCircles
		.attr("class", function(e) { return e.hasChildren? ( self.selectedEdge == e ? "selectedEdgeEnd" : "edgeEnd" ) : "invalidEdgeEnd"; })
		.attr("cx", function(e) { return self.xScale(e.r / e.l); })
		.attr("cy", function(e) { return self.yScale(e.s); })
		.attr("r", "5px");;
	edgeTags
		.attr("class", "cornerTag")
		.attr("x", function(e) { return 10 + self.xScale(e.r / e.l); })
		.attr("y", function(e) { return 10 + self.yScale(e.s); })
		.text(function(e) { return "(" + e.r + (e.l == 1 ? "" : ( "/" + e.l) ) + "," + e.s + ")" });


	edgeLines.exit().remove();
	edgeCircles.exit().remove();
	edgeTags.exit().remove();

	var visible_PLLC = Array.from(self.currentPLLC).filter(self.is_visible);
	var possibleCirc = self.possibleEdgeEndSvg.selectAll("circle").data(visible_PLLC);

	possibleCirc.enter().append("circle")
		.on("mouseover", self.a0p_mouseover())
		.on("mouseout", self.a0p_mouseout());;
	possibleCirc
		.attr("class", "possibleA0Prime")
		.attr("cx", function(a){ return self.xScale(a.x); })
		.attr("cy", function(a){ return self.yScale(a.y); })
		.attr("r", "5px");;

	possibleCirc.exit().remove();

	// TODO: Maybe not a good place for selection update. RESTRUCTURE THE FLOW.
	if (self.selectedCorner)
		self.selectionInfo.innerHTML = self.objectToHTML(self.selectedCorner);
	else if (self.selectedEdge) 
		self.selectionInfo.innerHTML = self.objectToHTML(self.selectedEdge);
	else
		self.selectionInfo.innerHTML = "(Information on the selected object will be displayed here)"
}
