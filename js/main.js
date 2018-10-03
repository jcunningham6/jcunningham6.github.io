// function to instantiate the Leaflet map
function createMap(){
    // create the map
    var map = L.map('map_canvas', {
        center: [39.99, -75.762],
        zoom: 10
    });

    // add OSM base tilelayer
    L.tileLayer('https://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://openstreetmap.se/" target="_blank">OpenStreetMap Sweden</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // call getData() function
    getData(map);
}

// places county border on map
function countySymbol(data, map) {
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
}

// places proportional symbols on map --> called by getData()
function createPropSymbols(data, map, attributes) {
	/* L.geoJson(data, {
		pointToLayer: pointToLayer
	}).addTo(map); */
	
	L.geoJson(data, {
		pointToLayer: function(feature, latlng) {
			return pointToLayer(feature, latlng, attributes);
		}
	}).addTo(map);
}

// defines the proportional symbols and their popup info --> called by createPropSymbols()
function pointToLayer(feature, latlng, attributes) {
	//var oneAttribute = "sng_2000";
	var oneAttribute = attributes[0];
	
	//console.log(oneAttribute);

	// marker symbol style options
	var markerOpts = {
		fillColor: "#ff7800",
		color: "#000000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
	}
	
	// use attribute to set size of marker symbol
	var attValue = Number(feature.properties[oneAttribute]);
	
	markerOpts.radius = calcPropRadius(attValue);
	
	var ptLayer = L.circleMarker(latlng, markerOpts);
	
	// create and style popup info
	var popupContent = "<p><b>Parish:</b> " + feature.properties.NAME + "</p>";
	var dataYear = oneAttribute.split("_")[1];
	popupContent += "<p><b>Registered in " + dataYear + ":</b> " + feature.properties[oneAttribute] + " Parishoners</p>";
	
	// offsets the popup from the symbol
	ptLayer.bindPopup(popupContent, {
		offset: new L.Point(0,-markerOpts.radius)
	});
	
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
	// check parishioner count --> if only 1 (i.e. only installed pastor), set radius = 2
	if (ptValue == 1) {
		var radiusSymbol = 2;
	}
	// otherwise, set radius based on number of registered parishioners
	else {
		var areaSymbol = ptValue / 5;
		var radiusSymbol = Math.sqrt(areaSymbol/Math.PI);
	}
	
	return radiusSymbol;
}

// slide and reverse/skip button controls
function createSequenceControls(map, attributes) {
	// I have added the range-slider on the index.html page
	//$('#side_panel').append('<input class="range-slider" type="range">');
	
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
        var index = $('.range-slider').val();

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

        // update slider
        $('.range-slider').val(index);
		
		console.log(index);
		
		updatePropSymbols(map, attributes[index]);
    });

    // slider input event listener
    $('.range-slider').on('input', function() {
		// get new index value based on user moving the slider
		var indexRS = $(this).val();
		
		console.log(indexRS);
		
		updatePropSymbols(map, attributes[indexRS]);
    });
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

			// add parish name to popup content string
			var popupContent = "<p><b>Parish:</b> " + props.NAME + "</p>";
			//alert(props.NAME);

			// add formatted attribute to panel content string
			var dataYear = attribute.split("_")[1];
			popupContent += "<p><b>Registered in " + dataYear + ":</b> " + props[attribute] + " Parishoners</p>";

			// replace the layer popup, offsetting the popup from the circle
			layer.bindPopup(popupContent, {
				offset: new L.Point(0,-radius)
			});
        };
    });
};

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

// function retrieves all my GeoJSON data and places it on the map
function getData(map) {
    // load county polygon
	$.ajax("data/cc_lines.geojson", {
        dataType: "json",
		success: function(response) {

            //add county polygon as Leaflet GeoJSON layer and add it to the map
            countySymbol(response, map);
		}
    });
	
	// load parish data
    $.ajax("data/parishes_CC.geojson", {
        dataType: "json",
        success: function(response) {
			var ptAttributes = processData(response);
			
			//call function to create proportional symbols
			createPropSymbols(response, map, ptAttributes);
			createSequenceControls(map, ptAttributes);
        }
    });
}

$(document).ready(createMap);