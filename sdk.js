﻿/**
* Copyright 2013 STRATO AG
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
* http://www.apache.org/licenses/LICENSE-2.0
* 
*     Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* 
* 
* @description
* <h1>HiDrive JavaScript SDK</h1>
* <h2>Basic Use</h2>
* <p>
* To start using the SDK just add this script to your HTML and initialize the client with your own:
* <ul>
* <li>application Id</li>
* <li>application secret</li>
* <li>grant scope</li>
* <li>grant type</li>
* <li>redirection URL</li>
* <li>language for the login dialog</li>
* </ul>
* </p>
* 
* <code>
* HD.options({ 'appSecret': YOUR_APP_SECRET }); </br>
* HD.options({ 'appId': YOUR_APP_ID });</br>
* HD.options({ 'type': 'refresh_token' });</br>
* HD.options({ 'grantScope': 'admin,rw' });</br>
* HD.options({ 'redirectUrl': 'http://localhost:12345/' });</br>
* HD.options({ 'language': 'en' });</br>
* </code>
* 
*/
var HD = (function () {
    "use strict";
    var version = '0.0.1',
        getLoginUrl,
        isAuthorized,
        getFullUrl,
        getOAuthUrl,
        sendRequest,
        getMe,
        refreshAccessToken,
        logout,
        sessionClear,
        get,
        base,
        post,
        put,
        del,
        getRequestData,
        getRefreshToken,
        getFileTransactionUrl,
        getParameters,
        options,
        has,
        xhr,
        getApiUrl,
        opts = {
            'accessToken': null,
            'appId': null,
            'appSecret': null,
            'userScope': null,
            'grantScope': null,
            'type': null,
            'redirectUrl': null,
            'language': null,
            'userName': null,
            'accountId': null,
            'refreshToken': null,
            'apiUrl': null
        };

    sendRequest = function (opt, successCb, errorCb, progressCb) {
        var req = xhr(),
            key,
            i,
            innerKey,
            headers,
            dataString,
            array;
        req.onreadystatechange = function () {
            if (req._canceled) { return; }

            if (req.readyState === 4) {
                if (req.status >= 200 && req.status < 300) {
                    successCb(req);
                } else {
                    errorCb(req);
                }
                req.onreadystatechange = function () { };
            } else if (progressCb) {
                progressCb(req);
            }
        };

        req.open(opt.type || "GET", opt.url, true, opt.user, opt.password);
        req.responseType = opt.responseType || "";

        headers = { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "If-Modified-Since": "Mon, 27 Mar 1972 00:00:00 GMT" };

        opt.headers = opt.headers || headers;
        if (opt.authzheader) {
            opt.headers.Authorization = opt.authzheader;
        }

        Object.keys(opt.headers || {}).forEach(function (k) {
            req.setRequestHeader(k, opt.headers[k]);
        });

        dataString = "";
        if (opt.data) {
            for (key in opt.data) {
                if (opt.data.hasOwnProperty(key)) {
                    if (key === "array") {
                        array = opt.data[key];
                        for (i = 0; i < array.length; i++) {
                            if (dataString.length > 0) {
                                dataString += "&";
                            }
                            for (innerKey in array[i]) {
                                if (array[i].hasOwnProperty(innerKey)) {
                                    dataString += innerKey + "=" + encodeURIComponent(array[i][innerKey]);
                                }
                            }
                        }
                    } else {
                        if (dataString.length > 0) {
                            dataString += "&";
                        }
                        dataString += key + "=" + encodeURIComponent(opt.data[key]);
                    }
                }
            }
        }
        req.send(dataString);
    };

    getMe = function (successCb, errorCb) {
        get("/user/me", null, function (response) {
            options({ 'userName': response.alias });
            options({ 'accountId': response.account });
            successCb(response);
        }, function (result) {
            errorCb(result);
        }, function () { });
    };

    /**
    * @description
    * 
    * Makes a call to refresh a access token. An access token is valid until it expires.
    * For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation/
    *
    * @example 
    *   For example, suppose you want refresh the access token:
    *   
    *    var refreshToken = HD.options('refreshToken');
    *    HD.refreshAccessToken(refreshToken, function(response){
    *       //do something with response.access_token
    *    }, function(){
    *    });
    *
    * @access public
    * @function
    * @param {String} token Parameter obtained during a previous authorization code exchange. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Function} [successCb] Success callback function. 
    * @param {Function} [errorCb] Error callback function
    */
    refreshAccessToken = function (token, successCb, errorCb) {
        var parameters = {
            refresh_token: token || options('refreshToken'),
            grant_type: options('type'),
            client_id: options('appId'),
            client_secret: options('appSecret')
        };

        base("POST", "/token", parameters, function (response) {
            options({ 'accessToken': response.access_token });
            options({ 'userName': response.alias });
            successCb(response);
        }, function (result) {
            errorCb(result);
        }, function () {
        });
    };

    /**
    * Makes a call to get a refresh token. This function should be called after oAuth to get the new refresh token.
    * For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    *
    *    @example
    *    After the successful login process a code parameter will be delivered. 
    *    With this code you can request a refresh token.   
    *
    *    var loginSuccess = function (result) {   
    *        HD.refreshAccessToken(result.code, function(response) {
    *           //do something with response.refresh_token
    *       }, function(){
    *       });
    *    }
    *
    * @access public
    * @function
    * @param {String} [code] Parameter obtained during a previous authorization code exchange. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Function} [successCb] Success callback function. 
    * @param {Function} [errorCb] Error callback function
    */
    getRefreshToken = function (code, successCb, errorCb) {
        var parameters = {
            code: code,
            grant_type: "authorization_code",
            client_id: options('appId'),
            client_secret: options('appSecret')
        };

        base("POST", "/token", parameters, function (response) {
            options({ 'refreshToken': response.refresh_token });
            options({ 'accessToken': response.access_token });
            getMe(function (result) {
                successCb(result);
            }, function (result) {
                errorCb(result);
            });
        }, function (result) {
            errorCb(result);
        }, function () {
        });
    };

    /**
    * Makes a call to clear session configuration options.
    * The following parameters are deleted:
    * <ul>
    * <li>'accessToken'</li>
    * <li>'userName'</li>
    * <li>'accountId'</li>
    * <li>'userScope'</li>
    * <li>'refreshToken'</li>
    * </ul>
    *
    * @access public
    * @function
    */
    sessionClear = function () {
        options({ 'accessToken': undefined });
        options({ 'userName': undefined });
        options({ 'accountId': undefined });
        options({ 'userScope': undefined });
        options({ 'refreshToken': undefined });
    };

    /**
    * Makes a call to get the url for the login process.
    *
    * @access public
    * @function
    * @returns {String} Returns string with url.
    */
    getLoginUrl = function () {
        return getOAuthUrl() + '/authorize?response_type=code'; 
    };

    /**
    * Makes a call to get the url for access token request.
    *
    * @access public
    * @function
    * @returns {String} Returns string with url.
    */
    getOAuthUrl = function () {
       return 'https://www.hidrive.strato.com/oauth2';
    };

    /**
    * Makes a call to get the url for the API calls GET, POST, PUT and DELETE.
    *
    * @access public
    * @function
    * @returns {String} Returns string with API url.
    */
    getApiUrl = function () {
        return 'https://api.hidrive.strato.com/2.1';
    };

    /**
    * Makes a call to verify whether the current user is authorized or not.
    *
    * @access public
    * @function
    * @returns {Bool} If current user is authorized true is returned.
    */
    isAuthorized = function () {
        return options('accessToken') !== undefined;
    };

    has = function (obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    };

    /**
    * Makes a call to get or sets configuration options (access token, user name, account id, user scope, application id, application secret ).
    *
    * @example
    * When this method is called with no parameters it will return all of the 
    * current options.
    *   var options = HD.options();
    *
    * When this method is called with a string it will return the value of the option 
    * if exists, null if it does not.      
    *   var applicationId = HD.options('appId');
    *
    * When this method is called with an object it will merge the object onto the previous 
    * options object.      
    *   HD.options({appId: '123456'}); 
    *   HD.options({userName: 'ABC', accessToken: 'XYZ'}); //will set userName and
    *                                                        accessToken options
    *   var accessToken = HD.options('accessToken'); //will get the accessToken of 'XYZ'
    *
    * @access public
    * @function
    * @param {String} keyOrOptions Returns the value of the option if exists, null if it does not. The existing options are:
    * <ul>
    * <li> 'accessToken': Access token. </li>
    * <li> 'appId': Application id. </li>
    * <li> 'userScope': User scope.</li>
    * <li> 'grantScope': Grant scope.</li>
    * <li> 'type': Grant type.</li>
    * <li> 'redirectUrl': Login redirect url for oAuth e.g. 'http://localhost:12345/'.</li>
    * <li> 'language': Language for the login dialog.</li>
    * <li> 'user': The path to the file to download.</li>
    * <li> 'userName': User name.</li>
    * <li> 'accountId': Account id.</li>
    * <li> 'refreshToken': Refresh token.</li>
    * </ul>
    * @returns {Object} When this method is called with no parameters it will return all of the current options e.g. HD.options().
    * When this method is called with a string it will return the value of the option if exists, null if it does not e.g.options('appId').          
    */
    options = function (keyOrOptions) {
        var key;
        if (!keyOrOptions) {
            return opts;
        }
        if (Object.prototype.toString.call(keyOrOptions) === '[object String]') {
            return has(opts, keyOrOptions) ? opts[keyOrOptions] : null;
        }
        for (key in opts) {
            if (opts.hasOwnProperty(key)) {
                if (has(opts, key) && has(keyOrOptions, key)) {
                    opts[key] = keyOrOptions[key];
                }
            }
        }
    };

    getFullUrl = function (url) {
        var fullUrl = getApiUrl();
        if ((url.substr(0, "/token".length) === "/token") || (url.substr(0, "/revoke".length) === "/revoke")) {
            fullUrl = getOAuthUrl();
        }
        
        //var fullUrl = (url.substr(0, "/token".length) === "/token") || (url.substr(0, "/revoke".length) === "/revoke") ? getOAuthUrl() : getApiUrl();
        fullUrl += url;
        return fullUrl;
    };
    
    /**
    * Makes a call to clear the session data(access token, user name, account id, user scope) and revokes exists refresh token.
    *
    * @access public
    * @function
    */
    logout = function () {
        var parameters = {
            token: options('refreshToken'),
            type: "refresh",
            client_id: options('appId'),
            client_secret: options('appSecret')
        };
        base("POST", "/revoke", parameters, function () { }, function () { }, function () { });

        sessionClear();
    };

    /**
    * POST Method.
    *
    *   @example
    *   For example, create a new directory 
    *
    *       var parameters = {path: root/users/foobar/existingDir/newDir};
    *       HD.post("/dir", parameters, function(response){
    *           //do something with response
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    *   Create a new share link for a given file:
    *   For more details see the HiDrive API Documentation 
    *   https://dev.strato.com/hidrive/documentation/
    *
    *       var parameters = { path: "root/users/foobar/mySharefile.ext", type: "file",
    *                        ttl: 86400, maxcount: 50};
    *       HD.post("/sharelink", parameters, function(response){
    *           //do something with response
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    * @access public
    * @function
    * @param {String} [path] The path. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Object} [parameters] A JSON object containing the properties. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Function} [successCb] The callback function that is invoked when API call is successful.
    * @param {Function} [errorCb] The callback function that is invoked when API call is failed.
    * @param {Function} [progressCb] The callback function that is invoked for handling of progress notifications along the way.
    */
    post = function (path, parameters, successCb, errorCb, progressCb) {
        return base("POST", path, parameters, successCb, errorCb, progressCb);
    };

    /**
    * PUT Method.
    *    
    *    @example
    *       For example, change user data 
    *
    *       var parameters = {account: '1234', alias: 'XYZ', pasword: '******'};
    *       HD.put("/user", parameters, function(response){
    *           //do something with response
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    * @access public
    * @function
    * @param {String} [path] The path For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Object} [parameters] A JSON object containing the properties. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Function} [successCb] The callback function that is invoked when API call is successful.
    * @param {Function} [errorCb] The callback function that is invoked when API call is failed.
    * @param {Function} [progressCb] The callback function that is invoked for handling of progress notifications along the way.
    */
    put = function (path, parameters, successCb, errorCb, progressCb) {
        return base("PUT", path, parameters, successCb, errorCb, progressCb);
    };

    /**
    * DELETE Method.
    *    
    *    @example
    *       For example, delete a file 
    *
    *       var parameters = {path: 'root/public/foo.txt'};
    *       HD.delete("/file", parameters, function(response){
    *           //do something with response
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    * @access public
    * @function
    * @param {String} [path] The path For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Object} [parameters] A JSON object containing the properties. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Function} [successCb] The callback function that is invoked when API call is successful.
    * @param {Function} [errorCb] The callback function that is invoked when API call is failed.
    * @param {Function} [progressCb] The callback function that is invoked for handling of progress notifications along the way.
    */
    del = function (path, parameters, successCb, errorCb, progressCb) {
        return base("DELETE", path, parameters, successCb, errorCb, progressCb);
    };

    getRequestData = function (values, accessToken) {
        var myValues = {},
            value,
            member,
            oAuthHeader,
            data;

        if (values) {
            for (value in values) {
                if (values.hasOwnProperty(value)) {
                    myValues[value] = encodeURIComponent(values[value]);
                }
            }
        }

        oAuthHeader = "";
        data = "";
        for (member in myValues) {
            if (myValues.hasOwnProperty(member)) {
                if (data) {
                    data += "&";
                }
                data += member + "=" + myValues[member];
            }
        }

        if (accessToken) {
            oAuthHeader += "Bearer " + window.btoa(accessToken); // base 64 encode
        }
        return { oAuthHeader: oAuthHeader, data: data };
    };

    /**
    * Makes a call to get a access token string for authorization process. This value should be passed to the XHR call options parameter.
    * 
    * @access public
    * @returns {String} String that contains a authorization header "Bearer myaccesstoken" 
    */
    function getAuthorizationHeader() {
        var token = options('accessToken');
        if (token) {
            return "Bearer " + window.btoa(token); // base 64 encode
        }
        return null;
    }

    /**
    * GET Method.
    *    
    *    @example
    *       For example, get directory members: 
    *
    *       var parameters = {path: 'root/public/XYZ'};
    *       HD.get("/dir", parameters, function(response){
    *           //do something with response
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    *   Get corresponding sharelink:
    *   For more details see the HiDrive API Documentation 
    *   https://dev.strato.com/hidrive/documentation/
    *       
    *       var parameters = { id: '123456' };
    *       HD.get("/sharelink", parameters, function(response){
    *           //do something with response
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    * @access public
    * @function
    * @param {String} [path] The path. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Object} [parameters] A JSON object containing the properties. For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Function} [successCb] The callback function that is invoked when API call is successful.
    * @param {Function} [errorCb] The callback function that is invoked when API call is failed.
    * @param {Function} [progressCb] The callback function that is invoked for handling of progress notifications along the way.
    */
    get = function (path, parameters, successCb, errorCb, progressCb) {
        var absoluteUrl,
            data,
            requestOptions;

        absoluteUrl = getFullUrl(path);
        data = getRequestData(parameters, options('accessToken'));
        if (data.data) {
            absoluteUrl += "?" + data.data;
        }

        requestOptions = { type: "GET", url: absoluteUrl, authzheader: getAuthorizationHeader() };

        sendRequest(requestOptions,
            function (result) {
                // success
                if (result.status === 200 || result.status === 201) {
                    var obj = result.responseText;
                    try {
                        obj = JSON.parse(obj);
                    } catch (e) {
                    } finally {
                        successCb(obj);
                    }
                } else if (result.status === 204) {
                    successCb(result);
                } else {
                    errorCb(result);
                }
            },
            // error
            function (result) {
                var obj = result.responseText;

                try {
                    obj = JSON.parse(obj);
                    obj.status = result.status;
                } catch (e) {
                }
                if (result.status === 401) {
                    //try to refresh token 
                    refreshAccessToken(null, function () {
                        //try again
                        absoluteUrl = getFullUrl(path);
                        data = getRequestData(parameters, options('accessToken'));
                        if (data.data) {
                            absoluteUrl += "?" + data.data;
                        }
                        sendRequest({ type: "GET", url: absoluteUrl, authzheader: data.oAuthHeader },
                            // success
                            function (innerResult) {
                                var obj2 = innerResult.responseText;
                                if (innerResult.status === 200 || innerResult.status === 201) {
                                    try {
                                        obj2 = JSON.parse(obj2);
                                    } catch (ex) {
                                    } finally {
                                        successCb(obj2);
                                    }
                                } else {
                                    errorCb(obj2);
                                }
                            }, function (innerResult) {
                                errorCb(innerResult);
                            });
                    }, function (innerResult) {
                        errorCb(innerResult);
                    });
                } else {
                    errorCb(obj);
                }
            },
            progressCb());
    };

    base = function (verb, url, parameters, successCb, errorCb, progressCb) {
        var absoluteUrl,
            data;
        absoluteUrl = getFullUrl(url);
        data = getRequestData(parameters, options('accessToken'));
        sendRequest({ type: verb, url: absoluteUrl, authzheader: getAuthorizationHeader(), data: parameters }, function (result) {
            if (result.status === 200 || result.status === 201) {
                var obj = result.responseText;
                try {
                    obj = JSON.parse(obj);
                } catch (e) {
                } finally {
                    successCb(obj);
                }
            } else if (result.status === 204) {
                successCb(result);
            } else {
                errorCb(result);
            }
        }, function (result) {
            var obj = result.responseText;
            try {
                obj = JSON.parse(obj);
                obj.status = result.status;
            } catch (e) {
            }
            if (result.status === 401) {
                //try to refresh token  
                refreshAccessToken(null, function () {
                    //try again
                    absoluteUrl = getFullUrl(url);
                    data = getRequestData(parameters, options('accessToken'));
                    if (data.data) {
                        absoluteUrl += "?" + data.data;
                    }
                    sendRequest({ type: verb, url: absoluteUrl, authzheader: data.oAuthHeader }, function (innerResult) {
                        if (innerResult.status === 200 || innerResult.status === 201) {
                            var obj2 = innerResult.responseText;
                            try {
                                obj2 = JSON.parse(obj2);
                            } catch (e) {
                            } finally {
                                successCb(obj2);
                            }
                        } else {
                            errorCb(result);
                        }
                    }, function (innerResult) {
                        errorCb(innerResult);
                    });
                }, function (innerResult) {
                    errorCb(innerResult);
                });
            }else {
                errorCb(obj);
            }
        }, progressCb());
    };

    /**
    * Makes a call to get a static documents such as terms & conditions, imprint and data protection regulations.  
    * When success html should be returned.
    *    
    *    @example
    *       For example, get terms & conditions
    *
    *       HD.getStatic("https://www.hidrive.strato.com/apps/windows8/tos_free.html", function(response){
    *           //do something with response
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    * @access public
    * @function
    * @param {String} [url] The url to the file to download.
    * @param {Function} [successCb] The callback function that is invoked when API call is successful.
    * @param {Function} [errorCb] The callback function that is invoked when API call is failed.
    * @param {Function} [progressCb] The callback function that is invoked for handling of progress notifications along the way.
    */
    function getStatic(url, successCb, errorCb, progressCb) {
        sendRequest({ type: "GET", url: url, authzheader: undefined },
            function (result) {
                if (result.status === 200 || result.status === 201) {
                    successCb(result);
                } else {
                    errorCb(result);
                }
            }, function (result) {
                var obj = result;

                try {
                    obj = JSON.parse(result.response);
                    obj.status = result.status;
                } catch (e) {
                }
                errorCb(obj);
            }, progressCb());
    }

    /**
    * Makes a call to download a file.   
    * When success a blob should be returned.
    *    
    *    @example
    *       For example, get file as blob
    *       var parameters = {path: 'root/public/foo.jpg'};
    *       HD.getFile(parameters, function(blob){
    *           //do something with blob
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    * @access public
    * @function
    * @param {Object} [properties] A JSON object containing the properties for uploading a file:
    * <ul>
    * <li> path: Required. Path to an existing file.</li>
    * <li> width: Optional. Maximum width of the thumbnail</li>
    * <li> height: Optional. Maximum height of the thumbnail</li>
    * <li> snapshot: Optional. Name of snapshot</li>
    * </ul>
    * @param {Function} [successCb] The callback function that is invoked when API call is successful.
    * @param {Function} [errorCb] The callback function that is invoked when API call is failed.
    * @param {Function} [progressCb] The callback function that is invoked for handling of progress notifications along the way. 
    */
    function getFile(properties, successCb, errorCb, progressCb) {
        var absoluteUrl,
            data;
        absoluteUrl = getFullUrl("/file");
        data = getRequestData(properties, options('accessToken'));
        if (data.data) {
            absoluteUrl += "?" + data.data;
        }
        sendRequest({ type: "GET", url: absoluteUrl, authzheader: data.oAuthHeader, responseType: "blob" }, function (result) {
            if (result.status === 200) {
                successCb(result.response);
            } else {
                errorCb(result);
            }
        }, function (result) {
            errorCb(result);
        }, function (result) {
            progressCb(result);
        });
    }

    /**
    * Makes a call to get a thumbnail for a image file. 
    * When success a blob should be returned.
    *    
    *    @example
    *       For example, get file as blob
    *       var parameters = {path: 'root/public/foo.jpg', width: 60, height: 60};
    *       HD.getThumbnail(parameters, function(blob){
    *           //do something with blob
    *       }, function(){
    *
    *       }, function(){
    *
    *       });
    *
    * @access public
    * @function
    * @param {Object} [properties] A JSON object containing the properties for downloading a thumbnail:
    * <ul>
    * <li> path: Required. Path to an existing file.</li>
    * <li> width: Optional. Maximum width of the thumbnail</li>
    * <li> height: Optional. Maximum height of the thumbnail</li>
    * <li> snapshot: Optional. Name of snapshot</li>
    * For more details see the HiDrive API Documentation https://dev.strato.com/hidrive/documentation
    * @param {Function} [successCb] The callback function that is invoked when API call is successful.
    * @param {Function} [errorCb] The callback function that is invoked when API call is failed.
    * @param {Function} [progressCb] The callback function that is invoked for handling of progress notifications along the way.
    */
    function getThumbnail(properties, successCb, errorCb, progressCb) {
        var absoluteUrl,
            data;
        absoluteUrl = getFullUrl("/file/thumbnail");
        data = getRequestData(properties, options('accessToken'));
        if (data.data) {
            absoluteUrl += "?" + data.data;
        }
        sendRequest({ type: "GET", url: absoluteUrl, authzheader: data.oAuthHeader, responseType: "blob" }, function (result) {
            if (result.status === 200) {
                successCb(result.response);
            } else {
                errorCb(result);
            }
        }, function (result) {
            errorCb(result);
        }, function (result) {
            progressCb(result);
        });
    }

    getParameters = function (values) {
        var myValues = {},
            value,
            member,
            data = "";

        if (values) {
            for (value in values) {
                if (values.hasOwnProperty(value)) {
                    myValues[value] = values[value];
                }
            }
        }

        for (member in myValues) {
            if (myValues.hasOwnProperty(member)) {
                if (data) {
                    data += "&";
                }
                data += member + "=" + myValues[member];
            }
        }
        return data;
    };

    /**
    * Returns a url for a background upload or download operation:
    *    
    *    @example
    *       For example, get url for file upload operation
    *
    *       var properties = {dir: 'root/public', name: 'foo.jpg', on_exist: 'autoname'};
    *       HD.getFileTransactionUrl(properties);
    *
    * @access public
    * @function
    * @param {Object} [properties] A JSON object containing the properties for creating a url:
    * <ul>
    * <li> path: Optional. The path to the file to download. Only for background download operation.</li>
    * <li> dir: Optional. The name of the file. Only for background upload operation.</li>
    * <li> name: Optional. The target name of the file. Only for background upload operation.</li> 
    * <li> on_exist: Optional. Possible values: "autoname" - Find another name if the destination exists already. Only for background upload operation.</li>
    * @returns {String} Url for background upload and download operations 
    */
    getFileTransactionUrl = function (properties) {
        var absoluteUrl,
            data;
        absoluteUrl = HD.getFullUrl("/file");
        data = getParameters(properties);
        if (data) {
            absoluteUrl += "?" + data;
        }
        return absoluteUrl;
    };

    xhr = function () {
        try {
            return new XMLHttpRequest();
        } catch (e) {
            throw new Error('Browser is not CORS capable');
        }
    };

    //namespace
    return {
        options: options,
        getLoginUrl: getLoginUrl,
        getApiUrl: getApiUrl,
        getOAuthUrl: getOAuthUrl,
        version: version,
        isAuthorized: isAuthorized,
        get: get,
        getStatic: getStatic,
        logout: logout,
        post: post,
        put: put,
        "delete": del,
        getAuthorizationHeader: getAuthorizationHeader,
        refreshAccessToken: refreshAccessToken,
        getFile: getFile,
        getThumbnail: getThumbnail,
        getRefreshToken: getRefreshToken,
        sessionClear: sessionClear,
        getFullUrl: getFullUrl,
        getFileTransactionUrl: getFileTransactionUrl,
    };
})();
