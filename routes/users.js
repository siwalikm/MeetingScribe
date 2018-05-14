const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.json({user: 'no data present'});
});

module.exports = router;
