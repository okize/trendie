#!/usr/bin/env node

// modules
var path = require('path'),
    program = require('commander'),
    levelup = require('level'),
    _ = require('lodash'),
    colors = require('colors'),
    prompt = require('prompt');

// local vars
var db = levelup(path.resolve(__dirname, '..', 'config')),
    trendie = require(path.resolve(__dirname, '..', 'lib', 'trendie')),
    pkg = require(path.resolve(__dirname, '..', 'package.json'));

// $ trendie get
program
  .command('get [profileId]')
  .description('get Internet Explorer trends for a Google Analytics profile')
  .action(function (profileId) {

    if (!profileId) {
      return console.error('please enter the Google Analytics profile ID you wish to view (ie. 187623632)');
    }

    // check for username
    db.get('username', function (err, username) {

      if (err) {
        db.close();
        return console.error('the username has not been set'.red);
      }

      // check for password
      db.get('password', function (err, password) {

        if (err) {
          db.close();
          return console.error('the password has not been set'.red);
        }

        return trendie.getTrends(profileId, username, password);

      });

    });

  });

// $ trendie set-user
program
  .command('set-user')
  .description('set the Google Analytics username & password')
  .action(function (stuff) {

    var schema = {
      properties: {
        username: {
          description: 'Enter your username:',
          required: true,
          type: 'string',
        },
        password: {
          description: 'Enter your password:',
          required: true,
          type: 'string',
          hidden: true
        }
      }
    };

    // open prompt
    prompt.message = '';
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, function (err, result) {

      if (err) {
        return console.error('\ncould not save username or password'.red);
      }

      db.put('username', result.username, function (err) {

        if (err) {
          db.close();
          return console.error('username could not be saved', err);
        }

        db.put('password', result.password, function (err) {

          db.close();

          if (err) {
            return console.error('password could not be saved', err);
          }

          return console.log('username & password have been saved');

        });

      });

    });

  });

// $ trendie delete-user
program
  .command('delete-user')
  .description('delete a Google Analytics user')
  .action(function () {

    var opts = [
      { type: 'del', key: 'username' },
      { type: 'del', key: 'password' }
    ];

    return db.batch(opts, function (err) {

      db.close();

      if (err) return console.error('please try again', err);

      console.log('the user has been deleted');

    });

  });

// $ trendie show
program
  .command('show-user')
  .description('show the Google Analytics user that has been set')
  .action(function () {

    var hasPassword = true;

    // check for username
    db.get('username', function (err, username) {

      if (err) {
        db.close();
        return console.error('the username has not been set'.red);
      }

      // check for password
      db.get('password', function (err, password) {

        db.close();

        if (err) { hasPassword = false; }

        if (!password) {
          return console.log('the password for '.red + username + ' has not been set'.red);
        }

        return console.log(username);

      });

    });

  });

// display module version
program
  .version(pkg.version);

program.parse(process.argv);

// show help by default
if (!program.args.length) {

  program.parse([process.argv[0], process.argv[1], '-h']);
  process.exit(0);

}