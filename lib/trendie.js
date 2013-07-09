// temp globals
var gaId = 'ga:13858838';
var util = require('util');

// modules
var
  GA = require('googleanalytics'),
  Q = require('q'),
  moment = require('moment'),
  levelup = require('level');

var
  analytics = {},
  dateFormat = 'YYYY-MM-DD',
  dateToday = moment().format(dateFormat),
  dateLastMonth = moment(dateToday).subtract('days', 28).format(dateFormat),
  dateTwoMonthsAgo = moment(dateLastMonth).subtract('days', 28).format(dateFormat),
  dateYearAgo = moment(dateToday).subtract('days', 365).format(dateFormat),
  dateYearAgoPreviousMonth = moment(dateYearAgo).subtract('days', 28).format(dateFormat),
  gaRequestOpts = {
    lastMonthVisits: getGaRequestOpts(dateLastMonth, dateToday, 'ga:visits', ''),
    lastMonthBrowsers: getGaRequestOpts(dateLastMonth, dateToday, 'ga:visits', 'ga:browser,ga:browserVersion'),
    twoMonthsAgoVisits: getGaRequestOpts(dateTwoMonthsAgo, dateLastMonth, 'ga:visits', ''),
    twoMonthsAgoBrowsers: getGaRequestOpts(dateTwoMonthsAgo, dateLastMonth, 'ga:visits', 'ga:browser,ga:browserVersion'),
    yearAgoVisits: getGaRequestOpts(dateYearAgoPreviousMonth, dateYearAgo, 'ga:visits', ''),
    yearAgoBrowsers: getGaRequestOpts(dateYearAgoPreviousMonth, dateYearAgo, 'ga:visits', 'ga:browser,ga:browserVersion')
  },
  progress;

// create new google analytics object
var ga = new GA.GA(getGaUser());




// functions


function getGaUser() {

  var user = {
    user: '',
    password: ''
  };

  return user;

}

// returns a request options object
function getGaRequestOpts(startDate, endDate, metrics, dimensions) {

  var opts = {
    'ids': gaId,
    'start-date': startDate,
    'end-date': endDate,
    'metrics': metrics,
    'dimensions': dimensions
  };

  return opts;

}

function gaRequest(description) {

  var d = Q.defer();

  ga.get(gaRequestOpts[description], function (err, entries) {

    // reject promise or resolve with entries
    if (err) {
      d.reject(err);
    } else {
      d.resolve({description: description, entries: entries});
    }

  });

  return d.promise;

}

// output waiting dots...
function progressTicker() {
  process.stdout.write('.');
}









// start timer
console.time('time-to-run');

// start GA session
process.stdout.write('\ngetting data from google analytics');

// start progress ticker
progress = setInterval(progressTicker, 100);

ga.login(function (err, token) {

  if (err) return console.log(err);

  Q.allSettled([
    gaRequest('lastMonthVisits'),
    gaRequest('lastMonthBrowsers'),
    gaRequest('twoMonthsAgoVisits'),
    gaRequest('twoMonthsAgoBrowsers'),
    gaRequest('yearAgoVisits'),
    gaRequest('yearAgoBrowsers')
  ])
  .then(function (results) {

    var passed = [];

    // stop progress ticker
    clearInterval(progress);

    // output a newline
    console.log('\n');

    results.forEach(function (result) {
      if (result.state === "fulfilled") {
        passed.push(result.value);
      } else {
        console.error(result.reason);
      }
    });

    return passed;

  })
  .then(function (results) {

    util.debug(JSON.stringify(results));

  })
  .fail(function (err) {

    console.log('fail', err);

  })
  .finally(function () {

    // end timer
    console.log('\n');
    console.timeEnd('time-to-run');

  });

});