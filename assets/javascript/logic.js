var artistInput;
var locationInput;
var userLat;
var userLng;
var completeRecords = [];

// Fix CORS issue
var corsLink = "https://cors-anywhere.herokuapp.com/";

// Last.fm
var artistInfoAPIKey = "a93674405c17c38cdbf92c8fcd42acea";

// Sandbox Amadeus
var sandboxAPIKey = "9m6yYgeGs0WEqKpdcyFWPdo0yr2EIok4";

//------- Google Maps & Autocomplete Form Setup -------
var map;
var googleMapsAPIKey = "AIzaSyBeqkue5zvVyIEgSnJ4v3rdFixeW4j44Og";
var markers = []; // Necessary to remove markers

function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		zoom: 6,
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
		completeRecords = [];
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
			// console.log(bandsInTownQueryURL);
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
						// console.log(event);
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

						// Remove data from previous searches
						cheapestItinerary = {};
						eventAirport = {};

						// If there is a purchasing link for the ticket, allows users to click on Venue to redirect to purchasing link
						var venueName = event.venue.name;
						var eventTicketURL = "";
						if (event.offers.length > 0) {
							eventTicketURL = event.offers[0].url;
						};

						if (!locationInput) {
							var newRow = $("<tr>");
							newRow.append($("<td>").text(moment(event.datetime).format("MMMM D, YYYY")));
							newRow.append($("<td>").text(event.venue.city));
							newRow.append($("<td>").text(event.venue.country));
							// If the eventTicketURL is not defined
							if (eventTicketURL === "") {
								newRow.append($("<td>").text(event.venue.name));
							} else {
								newRow.append($("<td>").html("<a href=" + eventTicketURL + ">" + event.venue.name + "</a>"));
							};
							$(".search-results-table").append(newRow);
						} else {
							completeRecords.push({
								userLat: userLat,
								userLng: userLng,
								userAirport: {},
								date: moment(event.datetime).format("MMMM D, YYYY"),
								city: event.venue.city,
								eventLat: eventLat,
								eventLng: eventLng,
								eventAirport: {},
								country: event.venue.country,
								venue: event.venue.name,
								eventTicketURL: eventTicketURL,
								allPossibleDates: [],
								cheapestItinerary: {},
								lowestAirFare: "",
								lowestAirFareURL: "",
							});
						};
					});
				};

				// console.log(completeRecords);
				$.each(completeRecords, function(index, record) {
					// console.log(record);
					airportNearUser(record);
				});

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
	var airportNearUser = function(record) {
		var sandboxAirportNearQueryURL = "https://api.sandbox.amadeus.com/v1.2/airports/nearest-relevant?apikey=" + sandboxAPIKey + "&latitude=" + record.userLat + "&longitude=" + record.userLng;
		// console.log(sandboxAirportNearQueryURL)
		$.when($.ajax({
			url: sandboxAirportNearQueryURL,
			method: "GET"
		}).done(function(response) {
			// console.log(response);
			response.forEach(function(airport) {
				if ($.isEmptyObject(record.userAirport) || record.userAirport.distance >= airport.distance) {
						record.userAirport = airport;
						// console.log(record.userAirport.airport);
				};
			});
		})).then(function() {
			console.log("found airport near user for current record");
			airportNearEvent(record);
		})
	};

	// Find all the nearest airports within 500km of the event's latitude and longitude
	var airportNearEvent = function(record) {
		var sandboxAirportNearQueryURL = "https://api.sandbox.amadeus.com/v1.2/airports/nearest-relevant?apikey=" + sandboxAPIKey + "&latitude=" + record.eventLat + "&longitude=" + record.eventLng;
		// console.log(sandboxAirportNearQueryURL)
		$.when($.ajax({
			url: sandboxAirportNearQueryURL,
			method: "GET"
		}).done(function(response) {
			// console.log(response);
			response.forEach(function(airport) {
				if ($.isEmptyObject(record.eventAirport) || record.eventAirport.distance >= airport.distance) {
						record.eventAirport = airport;
				};
			});
		})).then(function() {
			console.log("found airport near event for current record");
			cheapestAirFare(record);
		});
	};


	// Find the lowest air fare with departure date +/-3 days before venue date and return date +/- 3 days after venue date (9 possibilities)
	var cheapestAirFare = function(record) {
		if (record.userAirport.airport === record.eventAirport.airport) {
			var newRow = $("<tr>");
			newRow.append($("<td>").text(record.date));
			newRow.append($("<td>").text(record.city));
			newRow.append($("<td>").text(record.country));
			// If the ticketURL is not defined
			if (record.eventTicketURL === "") {
				newRow.append($("<td>").text(record.venue));
			} else {
				newRow.append($("<td>").html("<a href=" + record.eventTicketURL + " target='_blank'>" + record.venue + "</a>"));
			};
			newRow.append($("<td>").text("Not Available"));
			$(".search-results-table").append(newRow);
		} else {
			// var allPossibleDates = [];
			var allPossibleDepartureDates = [];
			var allPossibleReturnDates = [];
			var currentDate = moment().format("YYYY-MM-DD");
			for (var i = 1; i < 4; i++) {
				var possibleDepartureDate = moment(moment(record.date).subtract(i, "days")).format("YYYY-MM-DD");
				// If the departure date is greater than the current date
				if (moment(possibleDepartureDate).diff(moment(currentDate), "days") > 0) {
					allPossibleDepartureDates.push(possibleDepartureDate);
				};
				allPossibleReturnDates.push(moment(moment(record.date).add(i, "days")).format("YYYY-MM-DD"));
			};
			// console.log("All Possible Departure Dates: " + allPossibleDepartureDates);
			// console.log("All Possible Return Dates: " + allPossibleReturnDates);

			// If there are no departure dates available 
			if (allPossibleDepartureDates.length === 0) {
				var newRow = $("<tr>");
				newRow.append($("<td>").text(record.date));
				newRow.append($("<td>").text(record.city));
				newRow.append($("<td>").text(record.country));
				// If the eventTicketURL is not defined
				if (record.eventTicketURL === "") {
					newRow.append($("<td>").text(record.venue));
				} else {
					newRow.append($("<td>").html("<a href=" + record.eventTicketURL + " target='_blank'>" + record.venue + "</a>"));
				};
				newRow.append($("<td>").text("Not Available"));
				$(".search-results-table").append(newRow);
			} else {
				$.each(allPossibleDepartureDates, function(index1, departureDate) {
					$.each(allPossibleReturnDates, function(index2, returnDate) {
						record.allPossibleDates.push({
							departureDate: departureDate,
							returnDate: returnDate
						});
					});
				});

				console.log("found all possible dates");
				// console.log(record);

				$.each(record.allPossibleDates, function(index, possibleDate) {
					var numberOfResultsPerPair = 2;
					var sandboxFlightLowFareQueryURL = corsLink + "https://api.sandbox.amadeus.com/v1.2/flights/low-fare-search?apikey=" + sandboxAPIKey + "&origin=" + record.userAirport.airport + "&destination=" + record.eventAirport.airport + "&departure_date=" + possibleDate.departureDate + "&return_date=" + possibleDate.returnDate + "&number_of_results=" + numberOfResultsPerPair;
					console.log(sandboxFlightLowFareQueryURL);
					(function(index) {
						$.ajax({
							url: sandboxFlightLowFareQueryURL,
							method: "GET",
							contentType: "application/json; charset=utf-8",
							dataType: "json",
							cache: true
						}).done(function(response) {
							$.each(response.results, function(index, itinerary) {
								// console.log("Departure Date: " + itinerary.itineraries[0].outbound.flights[0].departs_at);
								// console.log("Return Date: " + itinerary.itineraries[0].inbound.flights[0].departs_at);
								console.log("Price: " + itinerary.fare.price_per_adult.total_fare);
								if ($.isEmptyObject(record.cheapestItinerary) || parseFloat(record.cheapestItinerary.fare.price_per_adult.total_fare) > parseFloat(itinerary.fare.price_per_adult.total_fare)) {
									record.cheapestItinerary = itinerary;
									console.log(record.cheapestItinerary);
									var cheapestDepartureDate = moment(record.cheapestItinerary.itineraries[0].outbound.flights[0].departs_at).format("YYYY-MM-DD");
									var cheapestReturnDate = moment(record.cheapestItinerary.itineraries[0].inbound.flights[0].departs_at).format("YYYY-MM-DD");
									record.lowestAirFare = parseFloat(record.cheapestItinerary.fare.price_per_adult.total_fare);
									record.lowestAirFareURL = "https://www.google.com/flights/?#search;f=" + record.userAirport.airport + ";t=" + record.eventAirport.airport + ";d=" + cheapestDepartureDate + ";r=" + cheapestReturnDate + ";so=p";
								};
							});
							if (index === record.allPossibleDates.length - 1) {
								var newRow = $("<tr>");
								newRow.append($("<td>").text(record.date));
								newRow.append($("<td>").text(record.city));
								newRow.append($("<td>").text(record.country));
								// If the eventTicketURL is not defined
								if (record.eventTicketURL === "") {
									newRow.append($("<td>").text(record.venue));
								} else {
									newRow.append($("<td>").html("<a href=" + record.eventTicketURL + " target='_blank'>" + record.venue + "</a>"));
								};
								// If the cheapestItinerary does not exist 
								if (record.cheapestItinerary === "") {
									newRow.append($("<td>").text("Not Available"));
								} else {
									newRow.append($("<td>").html("<a href=" + record.lowestAirFareURL + " target='_blank'>$" + record.lowestAirFare.toFixed(2)));
								};
								$(".search-results-table").append(newRow);
								console.log("found cheapest fare");
								console.log("done!!");
							};
						}).fail(function(jqXHR, textStatus) {
							record.cheapestItinerary = "";
							record.lowestAirFare = "";
							record.lowestAirFareURL = "";
						});
					})(index);
				});
			};

		};
	};

});
