// *********************************************************************************
// ****************** GLOBAL VARTIABLES ********************************************

// map variable --> needs to be global because it is called by createMap(), createLegend(), and deanery filter event listener
var map = L.map('map_canvas', {
        //center: [39.99, -75.762],
		center: [40.126202, -75.412308],
        zoom: 9
});

// variable to hold my parish data for the L.geoJson action in createPropSymbols()
var parishData;

// variable to hold my deanery data for the L.geoJson action in deanerySymbol()
var deaneryData;

// variable to store the year number
var yrQueried;

// variable used for updating legend control container
var legendIndex = 0;
// ****************** GLOBAL VARTIABLES ********************************************
// *********************************************************************************


// function called by radio button check on index.html page
function getDeaneries(map) {
	// get deanery data
	$.ajax("data/deaneries.geojson", {
		dataType: "json",
		success: function(response) {
			deanerySymbol(response, map);
		}
	});
}

// styles Deanery polygons and places them on the map --> called by getDeaneries()
function deanerySymbol(data, map) {
	kStyle = {
		color: "#000000",
		fillOpacity: .1
	}
	
	if (map.hasLayer(deaneryData)) {
		deaneryData.remove();
	}
	
	/* L.geoJson(data, {
		style: kStyle,
		onEachFeature: infoDeans
	}).addTo(map); */
	
	deaneryData = L.geoJson(data, {
		style: kStyle,
		onEachFeature: infoDeans
	}).addTo(map);
}

// Popup info for Deaneries; sends the layer to the back
function infoDeans(feature, layer) {
	var content = "";
	if (feature.properties) {
		content += "<p><b>Deanery Name:</b> " + feature.properties.DName + "</p>";
		layer.bindPopup(content, {
			maxWidth: 600
		});
	}
	
	// listen for layer 'add' event --> when fired, send the layer to the back
	layer.on({
		'add': function() {
			layer.bringToBack();
		}
	})
}

// function called by radio button check on index.html page
function removeDeaneries() {
	if (deaneryData) {
		deaneryData.remove();
	}
}


// **************************************************
// **************************************************
/* var deaneryLayer = {
	"Deaneries": deaneryData
};

L.control.layers(null, deaneryLayer).addTo(map); */
// **************************************************
// **************************************************


// variable used to store dropdown menu value
/* var filterval = document.getElementById("deanerynum").value; */

// function (stored in a variable) used for filter function in createPropSymbols()
var deaneryFilter = function(feature) {
	var filterval = document.getElementById("deanerynum").value;
	
	// variable concatenating Deanry number and name
	var dnumname = feature.properties.Deanery + " - " + feature.properties.DeanName;
	
	if (filterval == "ALL PARISH LOCATIONS") {
		return true;
	}
	else if (dnumname == filterval) {
		return true;
	}
}

// event handler for dropdown menu
$('#deanerynum').on("input", function() {
	filterval = document.getElementById("deanerynum").value;
	console.log("Filter changed to: ", filterval);
	
	// reset slider index back to first year of data with each change in deanery selection
	/* var index = 0;
	$('.range-slider').val(index); */
	
	//updateYearBox(legendIndex);
	
	//getData(map);
	$.ajax("data/parishes_AOP.geojson", {
        dataType: "json",
        success: function(response) {
			var ptAttributes = processData(response);
			
			//call function to create proportional symbols
			createPropSymbols(response, map, ptAttributes);
			
			// update legend using first attribute (i.e. 1980 data)
			updateSymbolLegend(map, ptAttributes[0]);
        }
    });
	
});

// function to instantiate the Leaflet map
function createMap(){
    // create the map
    /* var map = L.map('map_canvas', {
        center: [39.99, -75.762],
        zoom: 10
    }); */

    // add OSM base tilelayer
    L.tileLayer('https://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
	
    // call getData() function
    getData(map);
	
}

// places county border on map --> NOT CURRENTLY USED!!!!
/* function countySymbol(data, map) {
	var polyOpts = {
		weight: 1.5,
		color: "#000000",
		//fillColor: "#fff",
		opacity: 1,
		fillOpacity: 0
	}
	
	L.geoJson(data, {
		style: polyOpts
	}).addTo(map);
} */

// places proportional symbols on map --> called by getData()
function createPropSymbols(data, map, attributes) {
	// remove any existing points which may already be on the map
	if (map.hasLayer(parishData)) {
		parishData.remove();
	}

	// add parish point data to the map
	parishData = L.geoJson(data, {
		// filter function based on drop down selection
		filter: deaneryFilter,
		// create points layer for map
		pointToLayer: function(feature, latlng) {
			return pointToLayer(feature, latlng, attributes);
		}
	}).addTo(map);
	
	// zoom to bounds of filtered points (close any currently opened Popups
	map.closePopup();
	map.fitBounds(parishData.getBounds());
	
	// reset slider to first year of data every time points are placed (and re-placed)
	// and reset legend control container
	$('.range-slider').val(0);
	updateYearBox(0);
	$('.legend-control-container').text('Relative Parishioner Size in ' + yrQueried);
	
	updateSymbolLegend(map, attributes);
}

// defines the proportional symbols and their popup info --> called by createPropSymbols()
function pointToLayer(feature, latlng, attributes) {
	//var oneAttribute = "sng_2000";
	var oneAttribute = attributes[0];
	
	//console.log(oneAttribute);

	// marker symbol style options
	var markerOpts = {
		fillColor: "#FDFF00",
		color: "#000000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
	}
	
	// use attribute to set size of marker symbol
	var attValue = Number(feature.properties[oneAttribute]);
	
	markerOpts.radius = calcPropRadius(attValue);
	
	var ptLayer = L.circleMarker(latlng, markerOpts);
	
	// **************************** OLD POPUP STYLING ****************************
	// create and style popup info
	/* var popupContent = "<p><b>Parish:</b> " + feature.properties.NAME + "</p>";
	var dataYear = oneAttribute.split("_")[1];
	
	if (feature.properties[oneAttribute] == 1) {
		popupContent += "<p><b>Registered in " + dataYear + ":</b> " + "No Parishoners</p>";
	}
	else {
		popupContent += "<p><b>Registered in " + dataYear + ":</b> " + feature.properties[oneAttribute] + " Parishoners</p>";
	}
	
	// offsets the popup from the symbol
	ptLayer.bindPopup(popupContent, {
		offset: new L.Point(0,-markerOpts.radius)
	}); */
	// **************************** OLD POPUP STYLING ****************************
	
	createPopupInfo(feature.properties, oneAttribute, ptLayer, markerOpts.radius);
	
	// mouseover and mouseout event to open/close popup
	ptLayer.on({
		mouseover: function() {
			this.openPopup();
		},
		mouseout: function() {
			this.closePopup();
		}
	});
	
	return ptLayer;
}

function calcPropRadius(ptValue) {
	// check parishioner count --> if only 1 (i.e. parish exists now, but not at some time in the past), set radius = 2
	if (ptValue == 1) {
		var radiusSymbol = 2;
	}
	// otherwise, set radius based on number of registered parishioners
	else {
		var areaSymbol = ptValue / 7;
		var radiusSymbol = Math.sqrt(areaSymbol/Math.PI);
	}
	
	return radiusSymbol;
}

// slide and reverse/skip button controls
function createSequenceControls(map, attributes) {
	// I have added the range-slider on the index.html page
	//$('#side_panel').append('<input class="range-slider" type="range">');
	
	/* get current slider value --> needed to move it outside both event listeners below because getData() is called more than once, and therefore
	so is this function --> the index value was getting messed up when used as local variables within the event listeners */
	//var index = $('.range-slider').val();
	
	// set slider bounds
	$('.range-slider').attr({
        max: 7,
        min: 0,
        value: 0,
        step: 1
    });
	
	// I have added the skip buttons on the index.html page
	//$('#side_panel').append('<button class="skip" id="reverse">Reverse</button>');
    //$('#side_panel').append('<button class="skip" id="forward">Skip</button>');

	// replace buttons with pngs
	$('#reverse').html('<img src="img/arrow_left.png">');
    $('#forward').html('<img src="img/arrow_right.png">');
	
	// skip buttons click event listener
	$('.skip').click(function() {
        // get old index value
		// see line 145 above
        var index = $('.range-slider').val();
		console.log("Skip: ", index);

        // increment or decrement based on button clicked
        if ($(this).attr('id') == 'forward') {
            index++;
            // if past the last attribute, wrap around to first attribute
            index = index > 7 ? 0 : index;
        }
		else if ($(this).attr('id') == 'reverse') {
            index--;
            // if past the first attribute, wrap around to last attribute
            index = index < 0 ? 7 : index;
        };

        // update slider, coordinated with skip button actions
        $('.range-slider').val(index);
		console.log("New bar", index);
		
		legendIndex = index;
		updatePropSymbols(map, attributes[index]);
		
		//updateYearBox(index);
    });

    // slider input event listener
    $('.range-slider').on('input', function() {
		// get new index value based on user moving the slider
		var indexRS = $(this).val();
		//index = $(this).val();
		console.log("Bar: ", indexRS);
		//console.log("Bar", index);
		
		legendIndex = indexRS;
		updatePropSymbols(map, attributes[indexRS]);
		//updatePropSymbols(map, attributes[index]);
		
		//updateYearBox(indexRS);
    });
}

// updates input box in panel --> notifies user of current year
function updateYearBox (sliderNumber) {
	if (sliderNumber == 0) {
		yrQueried = 1980;
	}
	else if (sliderNumber == 1) {
		yrQueried = 1985;
	}
	else if (sliderNumber == 2) {
		yrQueried = 1990;
	}
	else if (sliderNumber == 3) {
		yrQueried = 1995;
	}
	else if (sliderNumber == 4) {
		yrQueried = 2000;
	}
	else if (sliderNumber == 5) {
		yrQueried = 2005;
	}
	else if (sliderNumber == 6) {
		yrQueried = 2010;
	}
	else {
		yrQueried = 2015;
	}
	console.log(yrQueried);
	
	qYear = document.getElementById("yrq");
	qYear.value = yrQueried;
}

// updates proportional symbols based on year of data --> called by slider and skip button events
function updatePropSymbols(map, attribute) {
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]) {
            // access feature properties
            var props = layer.feature.properties;
			
			//alert(props[attribute]);

            // update each feature's radius based on new attribute values
			// attribute check similar to check in calcPropRadius() function
			if (props[attribute] == 1) { 
				var radius = 2;
				layer.setRadius(radius);
				//alert(radius);
			}
			else {
				var radius = calcPropRadius(props[attribute]);
				layer.setRadius(radius);
			}

			// **************************** OLD POPUP STYLING ****************************
			/* // add parish name to popup content string
			var popupContent = "<p><b>Parish:</b> " + props.NAME + "</p>";
			//alert(props.NAME);

			// add formatted attribute to panel content string
			var dataYear = attribute.split("_")[1];
			
			if (props[attribute] == 1) {
				popupContent += "<p><b>Registered in " + dataYear + ":</b> " + "No Parishoners</p>";
			}
			else {
				popupContent += "<p><b>Registered in " + dataYear + ":</b> " + props[attribute] + " Parishoners</p>";
			}

			// replace the layer popup, offsetting the popup from the circle
			layer.bindPopup(popupContent, {
				offset: new L.Point(0,-radius)
			}); */
			// **************************** OLD POPUP STYLING ****************************
			
			createPopupInfo(props, attribute, layer, radius);
        };
    });
	
	updateYearBox(legendIndex);
	$('.legend-control-container').text('Relative Parishioner Size in ' + yrQueried);
	
	updateSymbolLegend(map, attribute);
};

// used to create PopUp info
function createPopupInfo(properties, attribute, layer, radius) {
	// add parish name to popup content string
	var popupContent = "<p><b>Parish:</b> " + properties.NAME + "</p>";
	
	// add formatted attribute to panel content string
	var dataYear = attribute.split("_")[1];
	
	if (properties[attribute] == 1) {
		popupContent += "<p><b>Registered in " + dataYear + ":</b> " + "No Parishoners</p>";
	}
	else {
		popupContent += "<p><b>Registered in " + dataYear + ":</b> " + properties[attribute] + " Parishoners</p>";
			}
			
	// replace the layer popup, offsetting the popup from the circle
	layer.bindPopup(popupContent, {
		offset: new L.Point(0,-radius)
	});
}

// create Legend Control and Dynamic Symbol Legend
function createLegend(map, attributes) {
	// call function to update year
	updateYearBox(legendIndex);
	console.log("You looked up: " + yrQueried);
	
	var LegendControl = L.Control.extend({
		options: {
			position: 'topright'
		},
		
		onAdd: function(map) {
			var container = L.DomUtil.create('div', 'legend-control-container');
			
			// Legend Control on map
			$(container).text('Relative Parishioner Size in ' + yrQueried);
			
			// add SVG --> I am placing this on tha side panel rather than the map
			var svg = '<svg id="attribute-legend" width="190px" height="80px">';
			//var circles = ["max", "mean", "min"];
			var circles = {
				max: 30,
				mean: 50,
				min: 70
			}
			
			/* for (var i=0; i<circles.length; i++) {
				svg += '<circle class="legend-circle" id="' + circles[i] + '" fill="#FDFF00" fill-opacity="0.8" stroke="#000000" cx="30"/>';
				
				svg += '<text id="' + circles[i] + '-text" x="65" y="60"></text>';
			} */
			for (var circle in circles) {
				//circle string
				svg += '<circle class="legend-circle" id="' + circle + '" fill="#FDFF00" fill-opacity="0.8" stroke="#000000" cx="30"/>';

				//text string
				svg += '<text id="' + circle + '-text" x="65" y="' + circles[circle] + '" fill="#635B53"></text>';
			};
			
			svg += '</svg>';
			$('#panel_legend').append(svg);
			
			return container
		}
	});
	
	map.addControl(new LegendControl());
	
	updateSymbolLegend(map, attributes[0]);
}

// used to assist the styling of Symbol Legend circles
function getCircleValues(map, attribute) {
	// start with min at highest possible and max at lowest possible number
	var min = Infinity,
		max = -Infinity;

	map.eachLayer(function(layer) {
	// get the attribute value
		if (layer.feature) {
			var attributeValue = Number(layer.feature.properties[attribute]);

			// test for min
			if (attributeValue < min) {
				min = attributeValue;
			};

			// test for max
			if (attributeValue > max) {
				max = attributeValue;
			};
		}
	});

	// set mean
	var mean = (max + min) / 2;

	// return values as an object
	return {
		max: max,
		mean: mean,
		min: min
	};
};

// update Symbol Legend
function updateSymbolLegend (map, attribute) {
	var circleValues = getCircleValues(map, attribute);
	console.log(circleValues);
	
	for (var key in circleValues) {
		var radius = calcPropRadius(circleValues[key]);
		console.log(radius);
		//console.log(circleValues[key]);
		
		$('#' + key).attr({
			cy: 69 - radius,
			r: radius
		});
		
		$('#'+key+'-text').text(Math.round(circleValues[key]*100)/100 + " parishioners");
	}
}

// create array of properties for the features --> called by getData() to load parish geoJson data
function processData(data) {
	// array - will hold attributes
	var attributes = [];

	// variable to get properties of first feature in data set
	var properties = data.features[0].properties;

	// get "sng" attributes (i.e. the year-focused attributes) and push them into the array
	for (var attribute in properties) {
		if (attribute.indexOf("sng") > -1) {
			attributes.push(attribute);
		}
	}
	
	console.log(attributes);
	
	return attributes;
}

// function retrieves parish GeoJSON data and places it on the map
function getData(map) {
    // load county polygon
	/* $.ajax("data/cc_lines.geojson", {
        dataType: "json",
		success: function(response) {

            //add county polygon as Leaflet GeoJSON layer and add it to the map
            countySymbol(response, map);
		}
    }); */
	
	// load parish data
    $.ajax("data/parishes_AOP.geojson", {
        dataType: "json",
        success: function(response) {
			var ptAttributes = processData(response);
			/* ptAttributes = processData(response); */
			
			//call function to create proportional symbols
			createPropSymbols(response, map, ptAttributes);
			createSequenceControls(map, ptAttributes);
			
			createLegend(map, ptAttributes);
        }
    });
}

$(document).ready(createMap);