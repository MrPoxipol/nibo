/** Created on May 6, 2014
 *  author: MrPoxipol
 */
// Sync Http requests
var httpSync = require('http-sync');
var util = require('util');
// Templates module
var Mustache = require('mustache');

var debug = require('../nibo/debug');

const COMMAND_NAME = 'weather';
// pattern for util.format()
const WEATHER_URL_PATTERN = 'api.openweathermap.org/data/2.5/weather?q=%s&lang=eng';

exports.meta = {
	name: 'weather',
	description: 'Fetches actual weather conditions from openweathermap.org at specific place on the Earth'
};

function kelvinsToCelcius(temperature) {
	return Math.round(temperature - 273.15);
}

function calcWindChill(temperature, windSpeed) {
	if (temperature < 10 && (windSpeed / 3.6) >= 1.8) {
		var windChill = (13.12 + 0.6215 * temperature - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * temperature * Math.pow(windSpeed, 0.16));
		windChill = Math.round(windChill);
	}

	return null;
}

function getWeatherFromJson(data) {
	var parsedJson;
	try {
		parsedJson = JSON.parse(data);
	} catch (e) {
		debug.debug('JSON parsing error');
		return;
	}

	var weather = {
		city: parsedJson.name
	};
	if (!weather.city) {
		return;
	}

	weather.country = parsedJson.sys.country;
	weather.temp = kelvinsToCelcius(parsedJson.main.temp);
	weather.description = parsedJson.weather[0].description;
	weather.windSpeed = parsedJson.wind.speed;
	weather.pressure = parsedJson.main.pressure;
	weather.windChill = calcWindChill(weather.temp, weather.windSpeed);

	var pattern;
	if (weather.windChill !== null)
		pattern = '[{{&city}}, {{&country}}]: {{&temp}}°C (felt as {{&windChill}}°C) - {{&description}}, {{&pressure}} hPa';
	else
		pattern = '[{{&city}}, {{&country}}]: {{&temp}}°C - {{&description}}, {{&pressure}} hPa';

	var output = Mustache.render(pattern, weather);

	return output;
}

function fetchWeather(place) {
	place = encodeURIComponent(place);
	var url = util.format(WEATHER_URL_PATTERN, place);

	var request = httpSync.request({
		method: 'GET',
		host: url
	});
	var data = request.end().body.toString();

	if (!data) {
		return "Weather is not avaiable at the moment.";
	}

	var result = getWeatherFromJson(data);
	if (!result) {
		result = 'Could not find weather information.';
	}

	return result;
}

exports.onCommand = function (bot, user, channel, command) {
	if (command.name !== COMMAND_NAME)
		return;

	if (command.args.length < 1)
		return;

	var place = command.args.join(' ');

	return fetchWeather(place);
};