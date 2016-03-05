// required modules
var fs = require('fs');
var path = require('path-extra');
var program = require('commander');
var Datastore = require('nedb');
var _ = require('lodash');
var colors = require('colors');
var prompt = require('prompt');

// local vars
var trendie = require(path.resolve(__dirname, '..', 'lib', 'app'));
var pkg = require(path.resolve(__dirname, '..', 'package.json'));
var homedir = path.homedir();
var configFile = path.resolve(homedir, '.trendie');
var db = new Datastore({ filename: configFile, autoload: true });
var jsonOut = false;

// program flags
program
  .version(pkg.version)
  .option('-s, --stdout', 'send json data to stdout instead of CLI table');

// $ trendie get
program
  .command('get [profileId]')
  .description('get Internet Explorer trends for a Google Analytics profile')
  .action(function (profileId) {

    if (!profileId) {
      return console.error('please enter the Google Analytics profile ID you wish to view (ie. 187623632)');
    }

    // get the active user
    db.findOne({ active: true }, function (err, user) {

      if (err || user === null) {
        return console.error('no user has not been set'.red);
      }

      if (user.password === '' || user.password === null) {
        return console.error('a password has not been set'.red);
      }

      if (program.debug === true) {
        jsonOut = true;
      }

      return trendie.getTrends(profileId, user.username, user.password, jsonOut);

    });

  });

// $ trendie set-user
program
  .command('set-user')
  .description('set the Google Analytics username & password')
  .action(function () {

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

      // set all accounts active to false
      db.update({ active: true }, { $set: { active: false } }, { multi: true },
        function (err, updatedCount) {

          if (err) {
            return console.error('\nerror trying to update username or password'.red);
          }

          // update or add new account information
          db.update(
            { username: result.username },
            {
              username: result.username,
              password: result.password,
              active: true
            },
            { upsert: true },
            function (err, numReplaced) {

              if (err) {
                return console.error('\nerror trying to update username or password'.red);
              }

              if (numReplaced === 1) {
                return console.log('username & password have been saved!'.green);
              } else {
                return console.error('\nsomething has gone horribly wrong'.red);
              }

            }
          );

        }
      );

    });

  });

// $ trendie show-user
program
  .command('show-user')
  .description('show the Google Analytics user that has been set')
  .action(function () {

    db.findOne({ active: true }, function (err, user) {

      if (err) {
        return console.error(err);
      }

      if (user === null) {
        return console.error('no user has been set!'.red);
      } else {
        return console.log(user.username);
      }

    });

  });

// $ trendie nuke
program
  .command('nuke')
  .description('remove all saved users')
  .action(function () {

    // confirmation config
    var property = {
      name: 'confirm',
      message: 'are you sure you want to remove all users?',
      validator: /y[es]*|n[o]?/,
      warning: 'Must respond "yes" or "no"',
      default: 'no'
    };

    prompt.message = '';
    prompt.delimiter = '';
    prompt.start();

    prompt.get(property, function (err, result) {

      if (result.confirm === 'yes') {

        fs.unlink(configFile, function (err) {

          if (err) {

            // if the file doesn't exist
            if (err.errno === 34) {
              return console.error('no users were found to delete!'.red);
            }

            return console.error(err);

          }

          return console.log('successfully removed all saved users'.green);

        });

      } else {

        console.log(property.message);

      }

    });

  });

program.parse(process.argv);

// show help by default
if (!program.args.length) {

  program.parse([process.argv[0], process.argv[1], '-h']);
  process.exit(0);

}
