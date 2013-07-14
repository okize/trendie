// modules
var
  GA = require('googleanalytics'),
  Q = require('q'),
  moment = require('moment'),
  _ = require('lodash'),
  colors = require('colors');

// returns a GA request options object
var getGaRequestOpts = function (profile, startDate, endDate, metrics, dimensions) {

  var opts = {
    'ids': 'ga:' + profile,
    'start-date': startDate,
    'end-date': endDate,
    'metrics': metrics,
    'dimensions': dimensions
  };

  return opts;

};

// returns an directional arrow
var getArrow = function (direction) {

  var increase = '⬆'.green,
      decrease = '⬇'.red;

  if (direction === 'up') {
    return increase;
  }

  return decrease;

};

// removes 'Visits' or 'Browsers' from the end of a word
var truncateDescription = function (description) {
  var re = /(Visits|Browsers)/g, newDescription;
  newDescription = description.replace(re, '');
  return newDescription;
};

// returns a JSON object from the large data chunk that's returned from GA
var processResults = function (results) {

  var processed = {}, description, browser, version, versionCount;

  _.each(results, function (result, i) {

    // gets a property name for the processed object
    description = truncateDescription(result.description);

    // adds property if it doesn't already exist
    if (!processed.hasOwnProperty(description)) {
      processed[description] = {};
    }

    // if there's no dimensions, then we've got visits not browsers
    if (typeof result.entries[0].dimensions[0]['ga:browser'] === 'undefined') {

      processed[description].totalVisits = result.entries[0].metrics[0]['ga:visits'];

    } else {

      processed[description].ieVisits = [];

      _.each(result.entries, function (entry, i) {
        browser = entry.dimensions[0]['ga:browser'];
        version = entry.dimensions[0]['ga:browserVersion'];
        if (browser === 'Internet Explorer' && version !== '999.1') {
          versionCount = {
            name: browser,
            version: version,
            count: entry.metrics[0]['ga:visits']
          };
          processed[description].ieVisits.push(versionCount);
        }
      });

    }

  });

  return processed;

};

// outputs progress dots...
var progressTicker = function () {
  process.stdout.write('.');
};

// main function: gets GA data and outputs to console
exports.getTrends = function (profile, username, password) {

  // local vars
  var
    dateFormat = 'YYYY-MM-DD',
    dateToday = moment().format(dateFormat),
    dateOneMonthAgo = moment(dateToday).subtract('days', 28).format(dateFormat),
    dateSixMonthsAgo = moment(dateToday).subtract('days', 183).format(dateFormat),
    dateSevenMonthsAgo = moment(dateSixMonthsAgo).subtract('days', 28).format(dateFormat),
    dateYearAgo = moment(dateToday).subtract('days', 365).format(dateFormat),
    dateYearAndMonthAgo = moment(dateYearAgo).subtract('days', 28).format(dateFormat),
    gaRequestOpts = {
      lastMonthVisits: getGaRequestOpts(profile, dateOneMonthAgo, dateToday, 'ga:visits', ''),
      lastMonthBrowsers: getGaRequestOpts(profile, dateOneMonthAgo, dateToday, 'ga:visits', 'ga:browser,ga:browserVersion'),
      sixMonthsAgoVisits: getGaRequestOpts(profile, dateSevenMonthsAgo, dateSixMonthsAgo, 'ga:visits', ''),
      sixMonthsAgoBrowsers: getGaRequestOpts(profile, dateSevenMonthsAgo, dateSixMonthsAgo, 'ga:visits', 'ga:browser,ga:browserVersion'),
      yearAgoVisits: getGaRequestOpts(profile, dateYearAndMonthAgo, dateYearAgo, 'ga:visits', ''),
      yearAgoBrowsers: getGaRequestOpts(profile, dateYearAndMonthAgo, dateYearAgo, 'ga:visits', 'ga:browser,ga:browserVersion')
    },
    progress,
    ga;

  // returns a promise for a GA request
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

  // start timer
  console.time('time-to-run');

  process.stdout.write('\ngetting data from google analytics');

  // start progress ticker
  progress = setInterval(progressTicker, 100);

  // create new google analytics object
  ga = new GA.GA({'user': username, 'password': password});

  // start GA session
  ga.login(function (err, token) {

    if (err) return console.error(err);

    // complete a queue of promise-returning functions
    Q.allSettled([
      gaRequest('lastMonthVisits'),
      gaRequest('lastMonthBrowsers'),
      gaRequest('sixMonthsAgoVisits'),
      gaRequest('sixMonthsAgoBrowsers'),
      gaRequest('yearAgoVisits'),
      gaRequest('yearAgoBrowsers')
    ])
    .then(function (results) {

      var passed = [];

      results.forEach(function (result) {
        if (result.state === "fulfilled") {
          passed.push(result.value);
        } else {
          console.error(result.reason);
        }
      });

      return processResults(passed);

    })
    .then(function (processed) {

      // stop progress ticker
      clearInterval(progress);

      console.log('\n');
      console.log(processed);

    })
    .fail(function (err) {

      // stop progress ticker
      clearInterval(progress);

      // if any errors happened in the promise-chain, output here
      console.log('\n');
      console.error('fail', err);

    })
    .finally(function () {

      // end timer
      console.log('\n');
      console.timeEnd('time-to-run');

    });

  });

};