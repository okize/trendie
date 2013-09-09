// modules
var GA = require('googleanalytics'),
    Q = require('q'),
    moment = require('moment'),
    _ = require('lodash'),
    numeral = require('numeral'),
    Table = require('cli-table'),
    Progger = require('progger'),
    colors = require('colors'),
    prettyjson = require('prettyjson');

// checks version against IE whitelist
var isValidIe = function (version) {

  var whitelist = [
    '10.0',
    '9.0',
    '8.0',
    '7.0',
    '6.0',
    '5.5'
  ];

  return whitelist.indexOf(version) >= 0;

};

// configuration for prettyjson output colors
var getPrettyjsonConfig = function () {
  return {
    keysColor: 'green',
    dashColor: 'yellow',
    stringColor: 'white'
  };
};

// returns a GA request options object
var getGaRequestOpts = function (profileId, startDate, endDate, metrics, dimensions) {

  var opts = {
    'ids': 'ga:' + profileId,
    'start-date': startDate,
    'end-date': endDate,
    'metrics': metrics,
    'dimensions': dimensions
  };

  return opts;

};

// removes 'Visits' or 'Browsers' from the end of a word
var truncateDescription = function (description) {

  var re = /(Visits|Browsers)/g, newDescription;

  newDescription = description.replace(re, '');

  return newDescription;

};

// returns an directional arrow
var getArrow = function (direction) {

  var up = '⬆'.green,
      down = '⬇'.red;

  if (direction === 'up') {
    return up;
  }

  return down;

};

// returns a percent string
var percent = function (dividend, divisor) {

  var p = dividend / divisor;

  return numeral(p).format('0.000%').white;

};

// returns a directional arrow & color-formated percent change
var percentChange = function (initial, final) {

  var change,
      noChange = false,
      positive = true,
      init = parseInt(initial, 10),
      fin = parseInt(final, 10);

  change = ((fin - init) / Math.abs(init));

  // need this because two consecutive periods with no visits by a browser
  // results in division by zero above
  if (isNaN(change)) {
    change = 0;
  }

  if (change < 0) {
    positive = false;
  }

  // NaN is because of 0 / 0 above
  if (change < 0.0005 && change > -0.0005) {
    noChange = true;
  }

  // format into percentage
  change = numeral(change).format('0,0.0%');

  // format with or without directional arrows
  if (noChange) {
    return change.white;
  }
  if (positive) {
    return getArrow('up') + ' ' + change.green;
  }
  return getArrow('down') + ' ' + change.red;

};

// returns array of IE versions from data
var getIeVersions = function (data) {

  var versions = [];

  _.each(data, function (key, value) {
    _.each(data[value].ieVisits, function (key, value) {
      versions.push(key.version);
    });
  });

  // keep only unique values
  versions = _.uniq(versions);

  // sort version strings descending
  versions = versions.sort(function (a, b) {
    return b - a;
  });

  return versions;

};

// returns a formatted row for the cli table
var createRow = function (title, visitsLastMonth, visitsSixMonthsAgo, visitsLastYear, showPercentOfTotal, total) {

  var row = {},
      columns = [],
      percentOfTotal = '';

  if (showPercentOfTotal) {
    percentOfTotal = ' (' + percent(visitsLastMonth, total) + ')';
  }

  // past month
  if (typeof visitsLastMonth !== 'undefined') {
    columns.push(numeral(visitsLastMonth).format('0,0') + percentOfTotal);
  }

  // 6 months ago
  if (typeof visitsSixMonthsAgo !== 'undefined') {
    columns.push(numeral(visitsSixMonthsAgo).format('0,0') + ' ' + percentChange(visitsSixMonthsAgo, visitsLastMonth));
  }

  // a year ago
  if (typeof visitsSixMonthsAgo !== 'undefined') {
    columns.push(numeral(visitsLastYear).format('0,0') + ' ' + percentChange(visitsLastYear, visitsLastMonth));
  }

  row[title] = columns;

  return row;

};

// returns the count of browser occurrence
var getVersionCount = function (visits, ver) {

  var count = _.find(visits, { 'version': ver });

  if (typeof count === 'undefined') {
    count = { count: 0 };
  }

  return count.count;

};

// returns an array of rows that can be inserted into the cli table
var getTableRows = function (data) {

  var visits = {},
      ieVisits = {},
      rows = [],
      versions = getIeVersions(data);

  _.forEach(data, function (val, prop) {
    visits[prop] = val.totalVisits;
  });

  // add row for all browsers
  rows.push(createRow('All Browsers', visits.lastMonth, visits.sixMonthsAgo, visits.yearAgo, false, null));

  // add rows for IE browsers
  _.each(versions, function (ver) {

    _.each(data, function (val, prop) {
      ieVisits[prop] = getVersionCount(val.ieVisits, ver);
    });

    rows.push(createRow('IE ' + ver.cyan, ieVisits.lastMonth, ieVisits.sixMonthsAgo, ieVisits.yearAgo, true, visits.lastMonth));

  });

  return rows;

};

// returns the data needed to create a cli table
var getCliTable = function (data) {

  var table,
      header = [''],
      headerMap = {
        lastMonth: 'Past Month',
        sixMonthsAgo: '6 Months Ago',
        yearAgo: 'Year Ago'
      };

  // dynamically build the table header (for when there's not enough past data)
  _.each(_.keys(data), function (val) {
    header.push(headerMap[val]);
  });

  // create a new table header
  table = new Table({
    style: {
      'padding-left': 1,
      'padding-right': 1,
      'head': ['blue']
    },
    head: header
  });

  _.each(getTableRows(data), function (row) {
    table.push(row);
  });

  return table;

};

// returns an object from the large data chunk that's returned from GA
var processResults = function (results) {

  var processed = {}, description, browser, version, versionCount;

  _.each(results, function (result, i) {

    // if there's no data bail out of this loop
    if (result.entries.length === 0) {
      return;
      // return console.error('\nno results for ' + truncateDescription(result.description));
    }

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

        if (browser === 'Internet Explorer' && isValidIe(version)) {

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

// main function: gets GA data and outputs to console
exports.getTrends = function (profileId, username, password, debugMode) {

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
      lastMonthVisits: getGaRequestOpts(profileId, dateOneMonthAgo, dateToday, 'ga:visits', ''),
      lastMonthBrowsers: getGaRequestOpts(profileId, dateOneMonthAgo, dateToday, 'ga:visits', 'ga:browser,ga:browserVersion'),
      sixMonthsAgoVisits: getGaRequestOpts(profileId, dateSevenMonthsAgo, dateSixMonthsAgo, 'ga:visits', ''),
      sixMonthsAgoBrowsers: getGaRequestOpts(profileId, dateSevenMonthsAgo, dateSixMonthsAgo, 'ga:visits', 'ga:browser,ga:browserVersion'),
      yearAgoVisits: getGaRequestOpts(profileId, dateYearAndMonthAgo, dateYearAgo, 'ga:visits', ''),
      yearAgoBrowsers: getGaRequestOpts(profileId, dateYearAndMonthAgo, dateYearAgo, 'ga:visits', 'ga:browser,ga:browserVersion')
    },
    errMsgSent = false,
    progress = new Progger(),
    ga;


  // @todo: this sucks
  // I think the only uncaught is with GA logins failing (ie. credentials are incorrect)
  process.on('uncaughtException', function (err) {

    // stop progress ticker if it's running
    if (typeof progress === 'object' && progress.isRunning()) {
      progress.stop();
    }

    return console.error('\nan unknown error has occurred!'.red);

  });

  // returns a promise for a GA request
  function gaRequest(description) {

    var d = Q.defer();

    ga.get(gaRequestOpts[description], function (err, entries) {

      // reject promise or resolve with entries
      if (err) {

        // this is a hacky way of preventing error message displaying multiple times
        if (err.message === 'User does not have sufficient permissions for this profile.') {

          if (!errMsgSent) {
            progress.stop();
            errMsgSent = true;
            console.log('\n' + 'This GA user does not have permissions to read profile: '.red + profileId);
          }

          d.reject('');

        } else {

          d.reject(err);

        }

      } else {

        d.resolve({description: description, entries: entries});

      }

    });

    return d.promise;

  }

  // start timer
  console.time('time-to-run');

  process.stdout.write('\nDownloading data from Google Analytics');

  // start progress ticker
  progress.start();

  // create new google analytics object
  ga = new GA.GA({'user': username, 'password': password});

  // start GA session
  ga.login(function (err, token) {

    if (err) {
      return console.log('error logging in to Google Analytics'.error);
    }

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

      // if (debugMode) {
      //   console.log(prettyjson.render(processed, getPrettyjsonConfig()));
      // }

      if (debugMode) {
        console.log('\n\n' + JSON.stringify(processed, null, '  '));
      }

      // get table for printing to the command line
      return getCliTable(processed);

    })
    .then(function (table) {

      // stop progress ticker
      progress.stop();

      console.log('\n');

      // if there were errors getting the data don't output empty table
      if (table.length <= 1) {
        return console.error('No data available!'.red);
      }

      if (!debugMode) {
        console.log(table.toString());
      }

    })
    .fail(function (error) {

      // stop progress ticker
      progress.stop();

      // if any errors happened in the promise-chain, output here
      console.log('\n');
      console.error('fail: ', error.stack);

    })
    .finally(function () {

      // end timer
      console.log('\n');
      console.timeEnd('time-to-run');

    });

  });

};