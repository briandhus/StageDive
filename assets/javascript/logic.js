// Google Maps
var map;
var googleMapsAPIKey = "AIzaSyBeqkue5zvVyIEgSnJ4v3rdFixeW4j44Og";
// Necessary to remove markers
var markers = [];

var bandInput;
var cityInput;
var stateInput;

// Sabre 
var lowestFareInfo = {};

function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		zoom: 5,
		center: new google.maps.LatLng(39.8097343, -98.5556199)
	});
};

function deleteMarkers() {
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(null);
	}
	markers = [];
}

$(document).ready(function() {

	$("#search").on("click", function() {

		// Prevent page from refreshing
		event.preventDefault();

		// Delete all markers from previous search
		deleteMarkers();

		$(".search-results-table tr td").remove();

		bandInput = $("#band-input").val();
		cityInput = $("#city-input").val();
		stateInput = $("#state-input").val();
		// console.log("Band Input: " + bandInput);
		// console.log("City Input: " + cityInput);
		// console.log("State Input: " + stateInput);

		// Clear form inputs
		$("#band-input").val("");
		$("#city-input").val("");
		$("#state-input").val("");

		var googleMapsQueryURL = "https://maps.googleapis.com/maps/api/geocode/json?address=" + cityInput + ",+" + stateInput + "&key=" + googleMapsAPIKey
		$.ajax({
			url: googleMapsQueryURL,
			method: "GET"
		}).done(function(response) {
			// console.log(googleMapsQueryURL);
			// console.log(response);
			// console.log("Latitude: " + response.results[0].geometry.location.lat);
			// console.log("Longitude: " + response.results[0].geometry.location.lng);
			$("#map").show();
			google.maps.event.trigger(map, "resize");
			var userLat = response.results[0].geometry.location.lat;
			var userLng = response.results[0].geometry.location.lng;
			// Reset map center to user input location
			var center = new google.maps.LatLng(userLat, userLng)
			map.setOptions({
				center: center
			});
			// Add marker to center of map
			var marker = new google.maps.Marker({
				position: center,
				map: map,
				title: cityInput,
				icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
				animation: google.maps.Animation.DROP
	        });
	        markers.push(marker);
		});

		$("#search-band-input").text(bandInput);

		$(".search-results").show();

		var bandsInTownQueryURL = "https://rest.bandsintown.com/artists/" + bandInput + "/events?app_id=uc%20berkeley%20extension%20coding%20bootcamp";
		console.log(bandsInTownQueryURL);
		$.ajax({
			url: bandsInTownQueryURL,
			method: "GET"
		}).done(function(events) {
			// console.log(response[0]);
			$.each(events, function(index, event) {
				var marker = new google.maps.Marker({
					position: {lat: parseFloat(event.venue.latitude), lng: parseFloat(event.venue.longitude)},
					map: map,
					title: event.venue.name,
					icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
					animation: google.maps.Animation.DROP
				})
				markers.push(marker);
				var newRow = $("<tr>");
				var	date = $("<td>").text(event.datetime);
				testtest();
				var sabreParams = getSabreParams(event.datetime); 
				sabreTokenCall(sabreParams);
				var city = $("<td>").text(event.venue.city);
				var country = $("<td>").text(event.venue.country);
				// If there is a purchasing link for the ticket, allows users to click on Venue to redirect to purchasing link
				var venueName = event.venue.name;
				if (event.offers.length > 0) {
					var ticketURL = event.offers[0].url;
					// console.log(ticketURL);
					var venue = $("<td>").html("<a href=" + ticketURL + ">" + venueName + "</a>");
				} else {
					var venue = $("<td>").text(venueName);
				}
				var lowestFare = $("<td>").text("");
				newRow.append(date);
				newRow.append(city);
				newRow.append(country);
				newRow.append(venue);
				newRow.append(lowestFare);
				$(".search-results-table").append(newRow);
			})
		})

	})

	$("#clear").on("click", function() {

		event.preventDefault();

		$(".search-results-table tr td").remove();
		$(".search-results").hide();

		deleteMarkers();

	});

	function testtest(sabreToken) {
		$.ajax({
			method: "GET",
			url: "https://api.test.sabre.com/v1/lists/supported/cities/sacramento/airports ", 
			headers: {
				"Authorization": "Bearer " + sabreToken
			}
		}).done(function(response) {
			console.log(response);
		})
	};

	function getSabreParams(date) {
		console.log("Venue Date: " + date);
		// Find all the possible return dates which are dates 1, 2, 3 day(s) after the event date 
		// Returns an array of length 3 in the form ["2017-01-02", "2017-01-03", "2017-01-04"]
		var possibleReturnDates = [];
		for (var i = 1; i < 4; i++) {
			var returnDate = moment(moment(date).add(i, "days")).format("YYYY-MM-DD");
			possibleReturnDates.push(returnDate);
		};
		console.log(possibleReturnDates);
		// Parameters to pass in to the Sabre AJAX call
		// Returns an array of length 3 in the form [["2017-01-02", "4,5,6"], ["2017-01-03", "3,4,5"], ["2017-01-04", "2,3,4"]]
		var parametersToLowestFare = [];
		for (var i = 1; i < 4; i++) {
			// departureDate is date i day(s) before the event date, max 3 days
			var departureDate = moment(moment(date).subtract(i, "days")).format("YYYY-MM-DD");
			var lengthOfStay = [];
			// For each possible return date, find the difference in days between the possible return date and the departure date
			possibleReturnDates.forEach(function(possibleReturnDate) {
				lengthOfStay.push(moment(possibleReturnDate).diff(moment(departureDate), "days"));
			})
			parametersToLowestFare.push({
				departureDate: departureDate, 
				lengthOfStay: lengthOfStay.join(",")
			})
		};
		console.log(parametersToLowestFare);
	};

	function sabreTokenCall(arrParams) {
		$.ajax({
			method: "POST",
			url: "https://api.test.sabre.com/v2/auth/token",
			contentType: "application/x-www-form-urlencoded",
			headers: {
				"Authorization": "Basic VmpFNk0yOXpPSGwzZG5sdmVqSnRaV0pqWnpwRVJWWkRSVTVVUlZJNlJWaFU6VERWVFJtazNiV2M9"
			},
			data: {
				"grant_type": "client_credentials"
			}
		}).done(function(response) {
			var sabreTokenResponse = response;
			var sabreToken = response.access_token;
			// console.log(sabreTokenResponse);
			// console.log(sabreToken);
			// console.log(date);
			// getLowestPriceFareInfo(arrParams, sabreToken);
			testtest(sabreToken);;
		})
	};


	function getLowestPriceFareInfo(arrParms, sabreToken) {
		arrParams.forEach(function(arr) {
			var departureDate = arr.departureDate;
			var lengthOfStay = arr.lengthOfStay;

			$.ajax({
				method: "GET",
				url: "https://api.test.sabre.com/v2/shop/flights/fares?origin=" + origin + "&destination=" + destination + "&departuredate=" + departureDate + "&lengthofstay=" + lengthOfStay, 
				headers: {
					"Authorization": "Bearer " + sabreToken
				}
			}).done(function(response) {
				allFlights = response.FareInfo;
				// console.log(allFlights);
				$.each(allFlights, function(index, flight) {
					// console.log(flight);
					// console.log("Departure Date: " + moment(flight.DepartureDateTime).format("MMMM D, YYYY"));
					// console.log("Return Date: " + moment(flight.ReturnDateTime).format("MMMM D, YYYY"));
					// console.log("Cheapest Airline: " + flight.LowestFare.AirlineCodes[0]);
					// console.log("Chepeast Price: USD $" + flight.LowestFare.Fare);
					// If there is nothing in flight fares to compare
					if (lowestFareInfo.length === 0 || lowestFareInfo.lowestFare >= flight.LowestFare.Fare) {
						lowestFareInfo.departureDate = moment(flight.DepartureDateTime).format("MMMM D, YYYY");
						lowestFareInfo.returnDate = moment(flight.ReturnDateTime).format("MMMM D, YYYY");
						lowestFareInfo.lowestFare = flight.LowestFare.Fare;
						lowestFareInfo.airline = flight.LowestFare.AirlineCodes[0];
					}
					console.log(lowestFareInfo)
				});
			});
		});
	};

});
