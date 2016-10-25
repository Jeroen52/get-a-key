var express = require('express');
var router = express.Router();
var OAuth = require("./../bin/aerohive/api/oauth");
var devApp = require('./../config.js').aerohiveApp;

var Account = require('./../bin/models/account');
/*================================================================
 ADMIN ACS OAUTH
 ================================================================*/
router.get('/oauth/reg', function (req, res) {
    if (req.query.hasOwnProperty('error')) {
        res.render('error', { error: { message: req.query.error } });
    } else if (req.query.hasOwnProperty("authCode")) {
        var authCode = req.query.authCode;
        OAuth.getPermanentToken(authCode, devApp.redirectUrl, devApp.clientSecret, devApp.clientID, function (data) {
            if (data.hasOwnProperty("error")) res.render('error', { error: data.error })
            else if (data.hasOwnProperty("data")) {
                var numAccounts = 0;
                for (var owner in data.data) {
                    var account = {
                        ownerId: data.data[owner].ownerId,
                        accessToken: data.data[owner].accessToken,
                        refreshToken: data.data[owner].refreshToken,
                        vpcUrl: data.data[owner].vpcUrl.replace("https://", ""),
                        vhmId: data.data[owner].vhmId,
                        expireAt: data.data[owner].expireAt,
                    }
                    numAccounts++;
                }
                if (numAccounts == 1) {
                    Account.
                        find({ ownerId: account.ownerId, vpcUrl: account.vpcUrl, vhmId: account.vhmId })
                        .exec(function (err, accountInDb) {
                            if (err) res.render('error', { error: { message: err } });
                            else if (accountInDb.length == 0) {
                                Account(account).save(function (err, result) {
                                    if (err) res.render('error', { error: { message: err } })
                                    else {
                                        req.session.xapi = {
                                            rejectUnauthorized: true,
                                            vpcUrl: account.vpcUrl,
                                            ownerId: account.ownerId,
                                            accessToken: account.accessToken,
                                            vhmId: account.vhmId,
                                            hmngType: "public"
                                        };
                                        res.redirect('/admin/');
                                    }
                                })
                            } else if (accountInDb.length == 1) {
                                accountInDb[0].accessToken = account.accessToken;
                                accountInDb[0].refreshToken = account.refreshToken;
                                accountInDb[0].expireAt = account.expireAt;
                                accountInDb[0].save(function (err, result) {
                                    if (err) res.render('error', { error: { message: err } })
                                    else {
                                        req.session.xapi = {
                                            rejectUnauthorized: true,
                                            vpcUrl: account.vpcUrl,
                                            ownerId: account.ownerId,
                                            accessToken: account.accessToken,
                                            vhmId: account.vhmId,
                                            hmngType: "public"
                                        };
                                        res.redirect('/admin/');
                                    }
                                })
                            }
                        })

                }
                else res.render('error', { error: { message: 'unable to save data... ' } })
            }
        });
    } else res.render('error', { error: { message: "Unkown error..." } });
});

/*================================================================
 DASHBOARD
 ================================================================*/
router.get('/', function (req, res, next) {
    if (req.session.hasOwnProperty("xapi"))
        res.render('admin', {
            title: 'Get-a-key Parameters'
        });
    else {
        res.render('error', {
            title: 'Get-a-Key Error',
            error: {
                message: "No session found. Please log in..."
            }
        });
    }
});


router.get('/logout/', function (req, res, next) {
    console.log("User " + req.session.passport.user.upn + " is now logged out.");
    req.logout();
    req.session.destroy();
    res.redirect('/login/');
});
module.exports = router;
