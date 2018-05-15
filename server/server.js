const express = require('express');
const config = require('config');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const path = require('path');
const indexRouter = require('../routes/index');

const port = config.get('express.port') || 5000;

const expressApp = class ExpressServer {
  constructor(options = {}) {
    const app = express();
    ExpressServer.viewEngineSetup(app, options);
    ExpressServer.setupRoutes(app, options);
    ExpressServer.errorSetup(app, options);
    ExpressServer.setupApp(app, options);
  }

  static viewEngineSetup(app, options) {
    app.set('views', path.join(__dirname, '../views'));
    app.engine('html', require('ejs').renderFile);
    app.set('view engine', 'html');

    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));
  };

  static setupRoutes(app, options) {
    app.use('/', indexRouter);
  }

  static errorSetup(app, options) {
    app.use(function(req, res, next) {
      next(createError(404));
    });

    app.use(function(err, req, res, next) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      res.status(err.status || 500);
      res.json({error: err});
    });
  };

  static setupApp(app, options) {
    app.listen(port);
    global.expressApp = app;
  }
};

module.exports = expressApp;

