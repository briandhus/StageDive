var artistInput;
var locationInput;
var userAirport = {};
var eventAirport = {};
var cheapestItinerary = {};
var userLat;
var userLng;
var completeRecords = [];
var sampleRecord = {};

// Fix CORS issue
var corsLink = "https://cors-anywhere.herokuapp.com/";

// Last.fm
var artistInfoAPIKey = "a93674405c17c38cdbf92c8fcd42acea";

// Sandbox Amadeus
var sandboxAPIKey = "EolbHMC7fvkFAdvPmQNkJT8tApOIFKCu";

//------- Google Maps & Autocomplete Form Setup -------
var map;
var googleMapsAPIKey = "AIzaSyBeqkue5zvVyIEgSnJ4v3rdFixeW4j44Og";
var markers = []; // Necessary to remove markers

function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		zoom: 5,
		center: new google.maps.LatLng(39.8097343, -98.5556199)
	});
	var addressInput = $("#address-input").val();
	var autocomplete = new google.maps.places.Autocomplete(document.getElementById("autocomplete"));
	autocomplete.bindTo("bounds", map);
};

function deleteMarkers() {
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(null);
	};
	markers = [];
};

$(document).ready(function() {

	$("#search").on("click", function() {

		// Prevent page from refreshing
		event.preventDefault();

		// Delete all markers from previous search
		deleteMarkers();

		// Remove data from previous searches
		$("#artist-image").removeAttr("src");
		$("#artist-bio").empty();
		$(".search-results-table tr td").remove();

		artistInput = $("#artist-input").val().trim();
		locationInput = $("#autocomplete").val();
		// console.log("Location Input: " + locationInput);

		// Clear form inputs
		$("#artist-input").val("");
		$("#autocomplete").val("");

		// If user inputs an artist
		if (artistInput) {

			// Hide this if previously triggered
			$("#artist-input-error").hide();

			// Show Google Maps regardless of whether user inputs location
			$("#map").show();
			google.maps.event.trigger(map, "resize");

			// If user inputs a location
			if (locationInput) {

				// Place a marker of the user's location onto Google Maps
				var googleMapsQueryURL = "https://maps.googleapis.com/maps/api/geocode/json?address=" + locationInput + "&key=" + googleMapsAPIKey
				// console.log(googleMapsQueryURL);
				$.ajax({
					url: googleMapsQueryURL,
					method: "GET"
				}).done(function(response) {
					// console.log(response);
					// console.log("Latitude: " + response.results[0].geometry.location.lat);
					// console.log("Longitude: " + response.results[0].geometry.location.lng);
					userLat = response.results[0].geometry.location.lat;
					userLng = response.results[0].geometry.location.lng;
					airportNearUser(userLat, userLng);
					// Reset map center to user input location
					var center = new google.maps.LatLng(userLat, userLng);
					map.setOptions({
						center: center
					});
					// Add marker to center of map
					var marker = new google.maps.Marker({
						position: center,
						map: map,
						title: response.results[0].formatted_address,
						icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
						animation: google.maps.Animation.DROP
			        });
			        markers.push(marker);
				});
			};


			$("#search-artist-input").text(artistInput);

			// Display the search results table
			$(".search-results").show();

			// Display the artist's biography and picture
			var artistInfoQueryURL = "http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=" + artistInput + "&api_key=" + artistInfoAPIKey + "&format=json";
			// console.log(artistInfoQueryURL);
			$.ajax({
				url: artistInfoQueryURL,
				method: "GET"
			}).done(function(response) {
				// console.log("Bio Summary: " + response.artist.bio.summary);
				// console.log("Bio Image: " + response.artist.image[3]["#text"]);

				// If there is an error with displaying the artist info, hide the entire bio div
				if (response.error) {
					$(".search-results-bio").hide();
				} else {
					$(".search-results-bio").show();
					$("#artist-image").attr("src", response.artist.image[3]["#text"]);
					$("#artist-bio").html(response.artist.bio.summary);
				};
			});

			var bandsInTownQueryURL = corsLink + "https://rest.bandsintown.com/artists/" + artistInput + "/events?app_id=uc%20berkeley%20extension%20coding%20bootcamp";
			console.log(bandsInTownQueryURL);
    			$.ajax({
				url: bandsInTownQueryURL,
				method: "GET",
				// dataType: "json"
			}).fail(function() {
				$(".search-results-table").append("<tr><td>Sorry, there are no upcoming events for " + artistInput + ". Please try again later.</td></tr>");
			}).done(function(events) {
				// console.log(events);

				// If user inputs a location, add a column to the table called "Lowest Air Fare (USD)"
				if (locationInput) {
					$("#lowest-fair").show();
				} else {
					$("#lowest-fair").hide();
				};

				// If there are no upcoming events for the user's artist
				if (events.length === 0) {
					$(".search-results-table").append("<tr><td>Sorry, there are no upcoming events for " + artistInput + ". Please try again later.</td></tr>");
				} else {
					$.each(events, function(index, event) {
						var eventLat = parseFloat(event.venue.latitude);
						var eventLng = parseFloat(event.venue.longitude);
						var marker = new google.maps.Marker({
							position: {lat: eventLat, lng: eventLng},
							map: map,
							title: event.venue.name,
							icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
							animation: google.maps.Animation.DROP
						});
						markers.push(marker);

						// If there is a purchasing link for the ticket, allows users to click on Venue to redirect to purchasing link
						// var venueName = event.venue.name;
						var eventTicketURL = "";
						if (event.offers.length > 0) {
							eventTicketURL = event.offers[0].url;
						};

						// Create a sample record
						sampleRecord = {
							date: moment(event.datetime).format("MMMM D, YYYY"),
							city: event.venue.city,
							country: event.venue.country,
							venue: event.venue.name,
							eventTicketURL: eventTicketURL
						};
						// console.log(sampleRecord);

						// If user inputs a location
						if (locationInput) {
							cheapestItinerary = {};
							eventAirport = {};
							airportNearEvent(eventLat, eventLng, sampleRecord);
						} else {
							var newRow = $("<tr>");
							newRow.append($("<td>").text(sampleRecord.date));
							newRow.append($("<td>").text(sampleRecord.city));
							newRow.append($("<td>").text(sampleRecord.country));
							// If the ticketURL is not defined
							if (!sampleRecord.ticketURL) {
								newRow.append($("<td>").text(sampleRecord.venue));
							} else {
								newRow.append($("<td>").html("<a href=" + sampleRecord.eventTicketURL + ">" + sampleRecord.venue + "</a>"));
							}
							$(".search-results-table").append(newRow);
						};

						// // If user does not input a location
						// if (!locationInput) {
						// 	newRow.append(date);
						// 	newRow.append(city);
						// 	newRow.append(country);
						// 	newRow.append(venue);
						// 	$(".search-results-table").append(newRow);
						// } else {
						// 	cheapestItinerary = {};
						// 	eventAirport = {};
						// 	// if (airportNearUser === airportNearEvent) {
						// 	// 	lowestAirFare = $("<td>").text("N/A");
						// 	// };
						// 	airportNearEvent(eventLat, eventLng, moment(event.datetime).format("YYYY-MM-DD"))
						// // 	$.when(airportNearEvent(eventLat, eventLng, moment(event.datetime).format("YYYY-MM-DD"))).done(function() {
						// // 		// debugger;
						// // 		var cheapestDepartureDate = moment(cheapestItinerary.itineraries[0].outbound.flights[0].departs_at).format("YYYY-MM-DD");
						// // 		var cheapestReturnDate = moment(cheapestItinerary.itineraries[0].inbound.flights[0].departs_at).format("YYYY-MM-DD");
						// // 		var lowestAirFareURL = "https://www.google.com/flights/?#search;f=" + userAirport.airport + ";t=" + eventAirport.airport + ";d=" + cheapestDepartureDate + ";r=" + cheapestReturnDate + ";so=p";
						// // 		var lowestAirFare = $("<td>").html("a href=" + lowestAirFareURL + ">" + cheapestItineraryPrice + "</a>");
						// // 		newRow.append(date);
						// // 		newRow.append(date);
						// // 		newRow.append(city);
						// // 		newRow.append(country);
						// // 		newRow.append(venue);
						// // 		newRow.append(lowestAirFare);
						// // 		$(".search-results-table").append(newRow);
						// // 	});
						// };
					});
				};
			});
		} else {
			$("#artist-input-error").show();
			$(".search-results").hide();
		};
	});

	$("#clear").on("click", function() {

		event.preventDefault();

		$(".search-results-table tr td").remove();
		$(".search-results").hide();

		deleteMarkers();

	});

	// Find all the nearest airports within 500km of the user's latitude and longitude
	var airportNearUser = function(lat, lng) {
		var sandboxAirportNearQueryURL = "https://api.sandbox.amadeus.com/v1.2/airports/nearest-relevant?apikey=" + sandboxAPIKey + "&latitude=" + lat + "&longitude=" + lng;
		// console.log(sandboxAirportNearQueryURL)
		$.ajax({
			url: sandboxAirportNearQueryURL,
			method: "GET"
		}).done(function(response) {
			// console.log(response);
			response.forEach(function(airport) {
				if ($.isEmptyObject(userAirport) || userAirport.distance >= airport.distance) {
						userAirport = airport;
				};
			});
		});
	};

	// Find all the nearest airports within 500km of the event's latitude and longitude
	var airportNearEvent = function(lat, lng, sampleRecord) {
		var sandboxAirportNearQueryURL = "https://api.sandbox.amadeus.com/v1.2/airports/nearest-relevant?apikey=" + sandboxAPIKey + "&latitude=" + lat + "&longitude=" + lng;
		// console.log(sandboxAirportNearQueryURL)
		return $.ajax({
			url: sandboxAirportNearQueryURL,
			method: "GET"
		}).done(function(response) {
			// console.log(response);
			response.forEach(function(airport) {
				if ($.isEmptyObject(eventAirport) || eventAirport.distance >= airport.distance) {
						eventAirport = airport;
				};
			});
			sampleRecord.userAirport = userAirport.airport;
			sampleRecord.eventAirport = eventAirport.airport;
			// console.log(sampleRecord);
			cheapestAirFare(sampleRecord);
		});
	};


	// Find the lowest air fare with departure date +/-3 days before venue date and return date +/- 3 days after venue date (9 possibilities)
	var cheapestAirFare = function(sampleRecord) {
		if (sampleRecord.userAirport === sampleRecord.eventAirport) {
			var newRow = $("<tr>");
			newRow.append($("<td>").text(sampleRecord.date));
			newRow.append($("<td>").text(sampleRecord.city));
			newRow.append($("<td>").text(sampleRecord.country));
			// If the ticketURL is not defined
			if (!sampleRecord.ticketURL) {
				newRow.append($("<td>").text(sampleRecord.venue));
			} else {
				newRow.append($("<td>").html("<a href=" + sampleRecord.eventTicketURL + " target='_blank'>" + sampleRecord.venue + "</a>"));
			};
			newRow.append($("<td>").text("Not Available"));
			$(".search-results-table").append(newRow);
		} else {
			var eventDate = moment(sampleRecord.date).format("YYYY-MM-DD");
			var allPossibleDates = [];
			var allPossibleDepartureDates = [];
			var allPossibleReturnDates = [];
			for (var i = 1; i < 4; i++) {
				allPossibleDepartureDates.push(moment(moment(eventDate).subtract(i, "days")).format("YYYY-MM-DD"));
				allPossibleReturnDates.push(moment(moment(eventDate).add(i, "days")).format("YYYY-MM-DD"));
			};
			console.log("All Possible Departure Dates: " + allPossibleDepartureDates);
			console.log("All Possible Return Dates: " + allPossibleReturnDates);

			allPossibleDepartureDates.forEach(function(departureDate) {
				allPossibleReturnDates.forEach(function(returnDate) {
					allPossibleDates.push({
						departureDate: departureDate,
						returnDate: returnDate
					});
				});
			});

			allPossibleDates.forEach(function(possibleDate) {
				var numberOfResultsPerPair = 2;
				var sandboxFlightLowFareQueryURL = "https://api.sandbox.amadeus.com/v1.2/flights/low-fare-search?apikey=" + sandboxAPIKey + "&origin=" + sampleRecord.userAirport + "&destination=" + sampleRecord.eventAirport + "&departure_date=" + possibleDate.departureDate + "&return_date=" + possibleDate.returnDate + "&number_of_results=" + numberOfResultsPerPair;
				console.log(sandboxFlightLowFareQueryURL);
				// console.log("Departure Date: " + possibleDate.departureDate);
				// console.log("Return Date: " + possibleDate.returnDate);
				$.ajax({
					url: sandboxFlightLowFareQueryURL,
					method: "GET"
				}).done(function(response) {
					response.results.forEach(function(itinerary) {
						if ($.isEmptyObject(cheapestItinerary) || parseFloat(cheapestItinerary.fare.price_per_adult.total_fare) > parseFloat(itinerary.fare.price_per_adult.total_fare)) {
							cheapestItinerary = itinerary;
							// console.log(cheapestItinerary);
							sampleRecord.cheapestItinerary = cheapestItinerary;
							var cheapestDepartureDate = moment(sampleRecord.cheapestItinerary.itineraries[0].outbound.flights[0].departs_at).format("YYYY-MM-DD");
							var cheapestReturnDate = moment(sampleRecord.cheapestItinerary.itineraries[0].inbound.flights[0].departs_at).format("YYYY-MM-DD");
							sampleRecord.lowestAirFare = parseFloat(cheapestItinerary.fare.price_per_adult.total_fare);
							sampleRecord.lowestAirFareURL = "https://www.google.com/flights/?#search;f=" + sampleRecord.userAirport + ";t=" + sampleRecord.eventAirport + ";d=" + cheapestDepartureDate + ";r=" + cheapestReturnDate + ";so=p";
							console.log(sampleRecord);
						};
					});

					if (completeRecords.indexOf(sampleRecord) == -1) {
						completeRecords.push(sampleRecord);
						console.log(completeRecords);
						var newRow = $("<tr>");
						newRow.append($("<td>").text(sampleRecord.date));
						newRow.append($("<td>").text(sampleRecord.city));
						newRow.append($("<td>").text(sampleRecord.country));
						// If the ticketURL is not defined
						if (!sampleRecord.ticketURL) {
							newRow.append($("<td>").text(sampleRecord.venue));
						} else {
							newRow.append($("<td>").html("<a href=" + sampleRecord.eventTicketURL + " target='_blank'>" + sampleRecord.venue + "</a>"));
						};
						newRow.append($("<td>").html("<a href=" + sampleRecord.lowestAirFareURL + " target='_blank'>$" + sampleRecord.lowestAirFare));
						$(".search-results-table").append(newRow);
					};
				});
			});
		};
	};

});
