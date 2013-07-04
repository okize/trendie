// modules
var
  GA = require('googleanalytics'),
  ga = new GA.GA(gaUser),
  Q = require('q'),
  moment = require('moment'),
  request = require('request');

// globals
var
  dateFormat = 'YYYY-MM-DD';

// returns a request options object
function gaRequestOptions(startDate, endDate, metrics, dimensions) {
  var opts = {
    'ids': gaId,
    'start-date': startDate,
    'end-date': endDate,
    'metrics': metrics,
    'dimensions': dimensions
  };
  return opts;
}

// output waiting dots...
function progress() {
  process.stdout.write('.');
}

// returns date object
function getDates() {
  var dates = {
    now: moment().format(dateFormat),
    previousMonth: moment(this.now).subtract('days', 28).format(dateFormat),
    previousPreviousMonth: moment(this.previousMonth).subtract('days', 28).format(dateFormat),
    yearAgo: moment(this.now).subtract('days', 365).format(dateFormat),
    yearAgoPreviousMonth: moment(this.yearAgo).subtract('days', 28).format(dateFormat)
  };
  return dates;
}
