/**
 * Created by lakhe on 4/6/16.
 */
'use strict';

var googleAnalyticsServiceController = function(){
 
    var dataProviderHelper = require('../data/mongo.provider.helper'),
        HTTPStatus = require('http-status'),
        messageConfig = require('../configs/api.message.config'),
        GoogleAnalytics = require('../models/google.analytics.server.model'),
        utilityHelper = require('../helpers/utilities.helper'),
        errorHelper = require('../helpers/error.helper'),
        Promise = require("bluebird");

    var documentFields='_id trackingId serviceAccountKeyFileName docProperties pollingInterval analyticsViewID';

    function GoogleAnalyticsModule(){}

    GoogleAnalyticsModule.CreateGoogleAnalyticsConfig = function(viewId, trackingId, loggedInUser, jsonFileName, docPath, pollingInterval){
        var newGoogleAnalyticsConfig = new GoogleAnalytics();

        newGoogleAnalyticsConfig.trackingId = trackingId;
        newGoogleAnalyticsConfig.serviceAccountKeyFileName = jsonFileName;
        newGoogleAnalyticsConfig.docProperties = {
            docPath : docPath
        };
        newGoogleAnalyticsConfig.analyticsViewID = viewId;
        newGoogleAnalyticsConfig.pollingInterval = pollingInterval;
        newGoogleAnalyticsConfig.addedBy = loggedInUser;
        newGoogleAnalyticsConfig.addedOn = new Date();
        return newGoogleAnalyticsConfig;
    };

    var _p = GoogleAnalyticsModule.prototype;

    _p.checkValidationErrors = function(req){

        req.checkBody('trackingId', messageConfig.googleAnalytics.validationErrMessage.trackingId).notEmpty();
        req.checkBody('analyticsViewID', messageConfig.googleAnalytics.validationErrMessage.analyticsViewID).notEmpty();
        return req.validationErrors();
    };

    _p.getGoogleAnalyticsConfig = function(){
        //Get google analytics data with empty object as filter param and documentFields as select fields
        return  dataProviderHelper.findOne(GoogleAnalytics, {}, documentFields);
    };

    _p.getGoogleAnalyticsConfigByID = function(req){
        return dataProviderHelper.findById(GoogleAnalytics, req.params.googleAnalyticsConfigId, documentFields);
    };

    _p.postGoogleAnalyticsConfig = function(req, res, next){
        req.body = JSON.parse(req.body.data);
        var documentInfo = utilityHelper.getDocumentFileInfo(req, null, next);
        //Check if the service account document file exists or not
        if(documentInfo._documentName) {
            //check for validation errors
            var errors = _p.checkValidationErrors(req);
            if (errors) {
                res.status(HTTPStatus.BAD_REQUEST);
                res.json({
                    message: errors
                });
            } else {
                dataProviderHelper.checkForDuplicateEntry(GoogleAnalytics, {})
                    .then(function (count) {
                        if (count > 0) {
                            throw new Promise.CancellationError('{ "statusCode":"' + HTTPStatus.CONFLICT + '", "message": "' + messageConfig.googleAnalytics.alreadyExists + '"}');
                        } else {
                            var modelInfo = utilityHelper.sanitizeUserInput(req, next);
                            var newGoogleAnalyticsConfig = GoogleAnalyticsModule.CreateGoogleAnalyticsConfig(modelInfo.analyticsViewID, modelInfo.trackingId, req.decoded.user.username, documentInfo._documentName, documentInfo._documentPath, modelInfo.pollingInterval);

                            return  dataProviderHelper.save(newGoogleAnalyticsConfig);
                        }
                    })
                    .then(function () {
                        res.status(HTTPStatus.OK);
                        res.json({
                            message: messageConfig.googleAnalytics.saveMessage
                        });
                    })
                    .catch(Promise.CancellationError, function (cancellationErr) {
                        errorHelper.customErrorResponse(res, cancellationErr, next);
                    })
                    .catch(function (err) {
                        return next(err);
                    });
            }
        }else{
            res.status(HTTPStatus.BAD_REQUEST);
            res.json({
                message: messageConfig.googleAnalytics.fieldRequiredJsonFile
            });
        }
    };

    _p.updateGoogleAnalyticsConfig = function(req,res, next){
        req.body = JSON.parse(req.body.data);
        var updateDocObj = {
            documentName: req.googleAnalyticsData.serviceAccountKeyFileName,
            docProperties: {
                docPath: req.googleAnalyticsData.docProperties.docPath
            }
        };
        var documentInfo = utilityHelper.getDocumentFileInfo(req, updateDocObj, next);
        if(documentInfo._documentName ) {
            var errors = _p.checkValidationErrors(req);

            if (errors) {
                res.status(HTTPStatus.BAD_REQUEST);
                res.json({
                    message: errors
                });
            } else {
                var modelInfo = utilityHelper.sanitizeUserInput(req, next);
                req.googleAnalyticsData.trackingId = modelInfo.trackingId;
                req.googleAnalyticsData.serviceAccountKeyFileName = documentInfo._documentName;
                req.googleAnalyticsData.docProperties.docPath = documentInfo._documentPath;
                req.googleAnalyticsData.analyticsViewID = modelInfo.analyticsViewID;
                req.googleAnalyticsData.pollingInterval = modelInfo.pollingInterval;
                req.googleAnalyticsData.updatedBy = req.decoded.user.username;
                req.googleAnalyticsData.updatedOn = new Date();

                dataProviderHelper.save(req.googleAnalyticsData)
                    .then(function () {
                        res.status(HTTPStatus.OK);
                        res.json({
                            message: messageConfig.googleAnalytics.updateMessage
                        });
                    })
                    .catch(function (err) {
                        return next(err);
                    });
            }
        }else{
            res.status(HTTPStatus.BAD_REQUEST);
            res.json({
                message: messageConfig.googleAnalytics.fieldRequiredJsonFile
            });
        }
    };

    return{
        getGoogleAnalyticsConfig : _p.getGoogleAnalyticsConfig,
        getGoogleAnalyticsConfigByID : _p.getGoogleAnalyticsConfigByID,
        postGoogleAnalyticsConfig : _p.postGoogleAnalyticsConfig,
        updateGoogleAnalyticsConfig : _p.updateGoogleAnalyticsConfig
    };
};

module.exports = googleAnalyticsServiceController;
