// here we are using jQuery notation
$(function () {
  // ====================================
  // Pretty time formatting
  // function for graph ticks
  function checkTime(i) {
    if ( i < 10 ) {
      i = "0" + i;
    }
    return i;
  }
  // ====================================
  // Function for getting URL parameters
  // http://stackoverflow.com/questions/1403888/get-url-parameter-with-jquery
  function getURLParameter(name) {
    return decodeURI(
      (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
  }
  // ====================================
  // Global quantile data
  var QUANTILES = {};
  // Global graph options
  var OPTIONS = {};
  // Global graph data
  var SERIES = {};
  // Global data smoothing parameter
  var SMOOTH = 1;
  var MAX_SMOOTH = 5;
  // Global data trimming parameter
  var TRIM = 0;
  // ====================================
  // We want to make the data look good
  // and enable to see trends if the exist
  // (just for exploratory purposes)
  function smoothAndTrimSeries (series, smooth, trim) {
    var series = jQuery.extend(true, [], series);
    data_length = series[0].data.length - 1;
    n_series = series.length - 1;
    // Smoothing average window
    for (var i=smooth; i<=data_length; i++) {
      for (var j=1; j<=smooth; j++) {
	for (var k=0; k<=n_series; k++) {
	  series[k].data[i][1] += series[k].data[i-j][1];
	}
      }
      for (var k=0; k<=n_series; k++) {
	series[k].data[i][1] /= smooth+1;
      }
    }
    // Trim can be used for zooming
    // Trim at least the smoothing part
    trim += smooth;
    for (var k=0; k<=n_series; k++) {
      for (var i=1; i<=trim; i++) {
	series[k].data.shift();
      }
    }
    return series;
  }
  // ====================================
  // Here you might get headache
  // We need to do two ajax queries:
  // 1. Quantiles (percentiles)
  // 2. ETL data
  // When page is loaded we need 1. and 2. in correct order (fetchAllData)
  // After that we can load just 2. every ~ 10 min (fetchGraphData)
  function fetchAllData () {
    // This will be executed
    // when data arrives from the server
    function onDataReceived(quantiles) {
      // store the data in a global variable
      QUANTILES = quantiles[0];
      // data graph options
      // http://people.iola.dk/olau/flot/API.txt
      // (we want global max in the graph)
      OPTIONS = {
         lines: { show: true },
         points: { show: false },
         xaxis: { ticks: 10, tickFormatter: function (val, axis) { var d = new Date(val); return checkTime(d.getHours()) + ":" + checkTime(d.getMinutes()); } },
         yaxes: [
           { position: "left", tickDecimals: 0, tickSize: 0, min: 0, max: QUANTILES.max_best },
           { position: "right", tickDecimals: 3, tickSize: 0, min: 0, max: QUANTILES.max_pickup }
         ],
         legend: { position: 'sw', backgroundColor: '#E5E1DE', backgroundOpacity: 0.60 }
      };
      // now we are ready to load the graph
      // ("time sensitive" data)
      fetchGraphData();
    }
    // jQuery ajax call
    // we just need the last quantile calculations
    // in form of json structure
    $.ajax({
      url: '/dm.json?ndata_elements=1',
      method: 'GET',
      dataType: 'json',
      success: onDataReceived
    });
  }
  // ====================================
  // fetch the data with jQuery ajax
  // just for the graph
  function fetchGraphData () {
     // massage the data into a graph
     // once it's fetched from the server
     function onDataReceived(series) {
       // Use latest data + plus precomputed quantiles
       // to make actual recommendation.
       // This is most important part of the DM process.
       // The graph is just for shows.
       SERIES = series;
       data_length = SERIES[0].data.length - 1;
       timing_diff = SERIES[2].data[data_length][1];
       if ( timing_diff > QUANTILES.quant1 ) {
         timing_suggestion = 'very good' 
       } else if ( timing_diff > QUANTILES.quant2 ) {
         timing_suggestion = 'good' 
       } else if ( timing_diff > QUANTILES.quant3 ) {
         timing_suggestion = 'so-so' 
       } else {
         timing_suggestion = 'bad'
       }
       // Update HTML with the recommendation
       $('#timing').text(timing_suggestion);
       // Plot the graph
       $.plot($('#plot'),smoothAndTrimSeries(SERIES,SMOOTH,TRIM),OPTIONS);
       // Create sliders
       $('#smooth').slider({min:0,max:MAX_SMOOTH,orientation:'vertical',value:SMOOTH,range:'min',slide:function(e,ui){SMOOTH=ui.value; $.plot($('#plot'),smoothAndTrimSeries(SERIES,SMOOTH,TRIM),OPTIONS);}});
       $('#trim').slider({min:0,max:data_length-MAX_SMOOTH-1,orientation:'horizontal',range:'min',slide:function(e,ui){TRIM=ui.value; $.plot($('#plot'),smoothAndTrimSeries(SERIES,SMOOTH,TRIM),OPTIONS);}});
     }
     // jQuery ajax call
     // pass number of needed data elements 
     // from the request to the json generator 
     $.ajax({
       url: '/etl.json?ndata_elements='+getURLParameter('ndata_elements'),
       method: 'GET',
       dataType: 'json',
       success: onDataReceived
     });
     setTimeout(fetchGraphData, 600000);
  }
  // ====================================
  // run all function
  // when the html is ready
  $(document).ready(function() {
    // iOS compatibility
    updateOrientation();
    // initialize quantile
    // and graph data
    fetchAllData();
    // initialize help file in
    // form of quickFlip
    $('#flip').quickFlip({ctaSelector:'.cta'});
  });
});
// ====================================
// Simple iOS compatibility:
// so that graph fits on the screen
function updateOrientation() {
  if ( typeof window.orientation != 'undefined' ) {
    var metas = document.getElementsByTagName('meta');
    for (i=0; i<metas.length; i++) {
      if (metas[i].name == 'viewport') {
	if ( window.orientation == 0 || window.orientation == 180 ) {
	  metas[i].content = 'initial-scale=0.6';
	} else {
	  metas[i].content = 'initial-scale=0.9';
	}
      }
    }
  }
}
// ====================================
// Simple iOS compatibility:
// prevent from sliding the whole window
document.ontouchmove = function(event){
  event.preventDefault();
}

