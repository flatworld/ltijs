"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));

// Dependencies
const provPlatformDebug = require('debug')('provider:platform'); // Classes


const Database = require('../../../GlobalUtils/Database');

const Keyset = require('../../../GlobalUtils/Keyset');

const Auth = require('./Auth');
/**
 * @description Class representing a registered platform.
 */


var _kid = new WeakMap();

var _platformName = new WeakMap();

var _platformUrl = new WeakMap();

var _clientId = new WeakMap();

var _authenticationEndpoint = new WeakMap();

var _accesstokenEndpoint = new WeakMap();

var _authConfig = new WeakMap();

class Platform {
  /**
     * @param {string} kid - Key id for local keypair used to sign messages to this platform.
     * @param {string} name - Platform name.
     * @param {string} platformUrl - Platform url.
     * @param {string} clientId - Client Id generated by the platform.
     * @param {string} authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
     * @param {string} accesstokenEndpoint - Access token endpoint for the platform.
     * @param {Object} authConfig - Authentication configurations for the platform.
     */
  constructor(kid, name, platformUrl, clientId, authenticationEndpoint, accesstokenEndpoint, authConfig) {
    _kid.set(this, {
      writable: true,
      value: void 0
    });

    _platformName.set(this, {
      writable: true,
      value: void 0
    });

    _platformUrl.set(this, {
      writable: true,
      value: void 0
    });

    _clientId.set(this, {
      writable: true,
      value: void 0
    });

    _authenticationEndpoint.set(this, {
      writable: true,
      value: void 0
    });

    _accesstokenEndpoint.set(this, {
      writable: true,
      value: void 0
    });

    _authConfig.set(this, {
      writable: true,
      value: void 0
    });

    (0, _classPrivateFieldSet2.default)(this, _kid, kid);
    (0, _classPrivateFieldSet2.default)(this, _platformName, name);
    (0, _classPrivateFieldSet2.default)(this, _platformUrl, platformUrl);
    (0, _classPrivateFieldSet2.default)(this, _clientId, clientId);
    (0, _classPrivateFieldSet2.default)(this, _authenticationEndpoint, authenticationEndpoint);
    (0, _classPrivateFieldSet2.default)(this, _accesstokenEndpoint, accesstokenEndpoint);
    (0, _classPrivateFieldSet2.default)(this, _authConfig, authConfig);
  } // Static methods

  /**
   * @description Gets a platform.
   * @param {String} url - Platform url.
   * @param {String} clientId - Platform generated Client ID.
   * @returns {Promise<Platform | false>}
   */


  static async getPlatform(url, clientId) {
    if (!url) throw new Error('MISSING_PLATFORM_URL');

    if (clientId) {
      const result = await Database.get('platform', {
        platformUrl: url,
        clientId: clientId
      });
      if (!result) return false;
      const _platform = result[0];
      const platform = new Platform(_platform.kid, _platform.platformName, _platform.platformUrl, _platform.clientId, _platform.authEndpoint, _platform.accesstokenEndpoint, _platform.authConfig);
      return platform;
    }

    const platforms = [];
    const result = await Database.get('platform', {
      platformUrl: url
    });

    if (result) {
      for (const platform of result) {
        platforms.push(new Platform(platform.kid, platform.platformName, platform.platformUrl, platform.clientId, platform.authEndpoint, platform.accesstokenEndpoint, platform.authConfig));
      }
    }

    return platforms;
  }
  /**
   * @description Gets a platform by the Id.
   * @param {String} platformId - Platform Id.
   * @returns {Promise<Platform | false>}
   */


  static async getPlatformById(platformId) {
    if (!platformId) throw new Error('MISSING_PLATFORM_ID');
    const result = await Database.get('platform', {
      kid: platformId
    });
    if (!result) return false;
    const _platform = result[0];
    const platform = new Platform(_platform.kid, _platform.platformName, _platform.platformUrl, _platform.clientId, _platform.authEndpoint, _platform.accesstokenEndpoint, _platform.authConfig);
    return platform;
  }
  /**
   * @description Gets all platforms.
   * @returns {Promise<Array<Platform>>}
   */


  static async getAllPlatforms() {
    const result = [];
    const platforms = await Database.get('platform');

    if (platforms) {
      for (const platform of platforms) result.push(new Platform(platform.kid, platform.platformName, platform.platformUrl, platform.clientId, platform.authEndpoint, platform.accesstokenEndpoint, platform.authConfig));
    }

    return result;
  }
  /**
   * @description Registers a platform.
   * @param {Object} platform
   * @param {String} platform.url - Platform url.
   * @param {String} platform.name - Platform nickname.
   * @param {String} platform.clientId - Client Id generated by the platform.
   * @param {String} platform.authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
   * @param {String} platform.accesstokenEndpoint - Access token endpoint that the tool will use to get an access token for the platform.
   * @param {Object} platform.authConfig - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."}
   * @param {String} platform.authConfig.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
   * @param {String} platform.authConfig.key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
   * @returns {Promise<Platform>}
   */


  static async registerPlatform(platform) {
    if (!platform || !platform.url || !platform.clientId) throw new Error('MISSING_PLATFORM_URL_OR_CLIENTID');
    let kid;

    const _platform = await Platform.getPlatform(platform.url, platform.clientId);

    if (!_platform) {
      if (!platform.name || !platform.authenticationEndpoint || !platform.accesstokenEndpoint || !platform.authConfig) throw new Error('MISSING_PARAMS');
      if (platform.authConfig.method !== 'RSA_KEY' && platform.authConfig.method !== 'JWK_KEY' && platform.authConfig.method !== 'JWK_SET') throw new Error('INVALID_AUTHCONFIG_METHOD. Details: Valid methods are "RSA_KEY", "JWK_KEY", "JWK_SET".');
      if (!platform.authConfig.key) throw new Error('MISSING_AUTHCONFIG_KEY');

      try {
        provPlatformDebug('Registering new platform');
        provPlatformDebug('Platform Url: ' + platform.url);
        provPlatformDebug('Platform ClientId: ' + platform.clientId); // Generating and storing RSA keys

        const keyPair = await Keyset.generateKeyPair();
        kid = keyPair.kid;
        await Database.replace('publickey', {
          platformUrl: platform.url,
          clientId: platform.clientId
        }, {
          key: keyPair.publicKey,
          kid: kid
        }, true, {
          kid: kid,
          platformUrl: platform.url,
          clientId: platform.clientId
        });
        await Database.replace('privatekey', {
          platformUrl: platform.url,
          clientId: platform.clientId
        }, {
          key: keyPair.privateKey,
          kid: kid
        }, true, {
          kid: kid,
          platformUrl: platform.url,
          clientId: platform.clientId
        }); // Storing new platform

        await Database.replace('platform', {
          platformUrl: platform.url,
          clientId: platform.clientId
        }, {
          platformName: platform.name,
          platformUrl: platform.url,
          clientId: platform.clientId,
          authEndpoint: platform.authenticationEndpoint,
          accesstokenEndpoint: platform.accesstokenEndpoint,
          kid: kid,
          authConfig: platform.authConfig
        });
        const plat = new Platform(kid, platform.name, platform.url, platform.clientId, platform.authenticationEndpoint, platform.accesstokenEndpoint, platform.authConfig);
        return plat;
      } catch (err) {
        await Database.delete('publickey', {
          kid: kid
        });
        await Database.delete('privatekey', {
          kid: kid
        });
        await Database.delete('platform', {
          platformUrl: platform.url,
          clientId: platform.clientId
        });
        provPlatformDebug(err.message);
        throw err;
      }
    } else {
      provPlatformDebug('Platform already registered');
      await Database.modify('platform', {
        platformUrl: platform.url,
        clientId: platform.clientId
      }, {
        platformName: platform.name || (await _platform.platformName()),
        authEndpoint: platform.authenticationEndpoint || (await _platform.platformAuthenticationEndpoint()),
        accesstokenEndpoint: platform.accesstokenEndpoint || (await _platform.platformAccessTokenEndpoint()),
        authConfig: platform.authConfig || (await _platform.platformAuthConfig())
      });
      return Platform.getPlatform(platform.url, platform.clientId);
    }
  }
  /**
   * @description Updates a platform by the Id.
   * @param {String} platformId - Platform Id.
   * @param {Object} platformInfo - Update Information.
   * @param {String} platformInfo.url - Platform url.
   * @param {String} platformInfo.clientId - Platform clientId.
   * @param {String} platformInfo.name - Platform nickname.
   * @param {String} platformInfo.authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
   * @param {String} platformInfo.accesstokenEndpoint - Access token endpoint that the tool will use to get an access token for the platform.
   * @param {object} platformInfo.authConfig - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."}
   * @param {String} platformInfo.authConfig.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
   * @param {String} platformInfo.authConfig.key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
   * @returns {Promise<Platform | false>}
   */


  static async updatePlatformById(platformId, platformInfo) {
    if (!platformId) {
      throw new Error('MISSING_PLATFORM_ID');
    }

    if (!platformInfo) {
      throw new Error('MISSING_PLATFORM_INFO');
    }

    const platform = await Platform.getPlatformById(platformId);
    if (!platform) return false;
    const oldURL = await platform.platformUrl();
    const oldClientId = await platform.platformClientId();
    const update = {
      url: platformInfo.url || oldURL,
      clientId: platformInfo.clientId || oldClientId,
      name: platformInfo.name || (await platform.platformName()),
      authenticationEndpoint: platformInfo.authenticationEndpoint || (await platform.platformAuthenticationEndpoint()),
      accesstokenEndpoint: platformInfo.accesstokenEndpoint || (await platform.platformAccessTokenEndpoint())
    };
    const authConfig = await platform.platformAuthConfig();
    update.authConfig = authConfig;

    if (platformInfo.authConfig) {
      if (platformInfo.authConfig.method) update.authConfig.method = platformInfo.authConfig.method;
      if (platformInfo.authConfig.key) update.authConfig.key = platformInfo.authConfig.key;
    }

    let alteredUrlClientIdFlag = false;

    if (platformInfo.url || platformInfo.clientId) {
      if (platformInfo.url !== oldURL || platformInfo.clientId !== oldClientId) alteredUrlClientIdFlag = true;
    }

    if (alteredUrlClientIdFlag) {
      if (await Database.get('platform', {
        platformUrl: update.url,
        clientId: update.clientId
      })) throw new Error('URL_CLIENT_ID_COMBINATION_ALREADY_EXISTS');
    }

    try {
      if (alteredUrlClientIdFlag) {
        await Database.modify('publickey', {
          kid: platformId
        }, {
          platformUrl: update.url,
          clientId: update.clientId
        });
        await Database.modify('privatekey', {
          kid: platformId
        }, {
          platformUrl: update.url,
          clientId: update.clientId
        });
      }

      await Database.modify('platform', {
        kid: platformId
      }, {
        platformUrl: update.url,
        clientId: update.clientId,
        platformName: update.name,
        authEndpoint: update.authenticationEndpoint,
        accesstokenEndpoint: update.accesstokenEndpoint,
        authConfig: update.authConfig
      });
      const platform = new Platform(platformId, update.name, update.url, update.clientId, update.authenticationEndpoint, update.accesstokenEndpoint, update.authConfig);
      return platform;
    } catch (err) {
      if (alteredUrlClientIdFlag) {
        await Database.modify('publickey', {
          kid: platformId
        }, {
          platformUrl: oldURL,
          clientId: oldClientId
        });
        await Database.modify('privatekey', {
          kid: platformId
        }, {
          platformUrl: oldURL,
          clientId: oldClientId
        });
      }

      provPlatformDebug(err.message);
      throw err;
    }
  }
  /**
   * @description Deletes a platform.
   * @param {string} url - Platform url.
   * @param {String} clientId - Tool clientId.
   * @returns {Promise<true>}
   */


  static async deletePlatform(url, clientId) {
    if (!url || !clientId) throw new Error('MISSING_PARAM');
    const platform = await Platform.getPlatform(url, clientId);
    if (platform) await platform.delete();
    return true;
  }
  /**
   * @description Deletes a platform by the Id.
   * @param {string} platformId - Platform Id.
   * @returns {Promise<true>}
   */


  static async deletePlatformById(platformId) {
    if (!platformId) throw new Error('MISSING_PLATFORM_ID');
    const platform = await Platform.getPlatformById(platformId);
    if (platform) await platform.delete();
    return true;
  } // Instance methods

  /**
   * @description Gets the platform url.
   */


  async platformUrl() {
    return (0, _classPrivateFieldGet2.default)(this, _platformUrl);
  }
  /**
   * @description Gets the platform client id.
   */


  async platformClientId() {
    return (0, _classPrivateFieldGet2.default)(this, _clientId);
  }
  /**
     * @description Sets/Gets the platform name.
     * @param {string} [name] - Platform name.
     */


  async platformName(name) {
    if (!name) return (0, _classPrivateFieldGet2.default)(this, _platformName);
    await Database.modify('platform', {
      platformUrl: (0, _classPrivateFieldGet2.default)(this, _platformUrl),
      clientId: (0, _classPrivateFieldGet2.default)(this, _clientId)
    }, {
      platformName: name
    });
    (0, _classPrivateFieldSet2.default)(this, _platformName, name);
    return name;
  }
  /**
     * @description Gets the platform Id.
     */


  async platformId() {
    return (0, _classPrivateFieldGet2.default)(this, _kid);
  }
  /**
   * @description Gets the platform key_id.
   */


  async platformKid() {
    return (0, _classPrivateFieldGet2.default)(this, _kid);
  }
  /**
   * @description Sets/Gets the platform status.
   * @param {Boolean} [active] - Whether the Platform is active or not.
   */


  async platformActive(active) {
    if (active === undefined) {
      // Get platform status
      const platformStatus = await Database.get('platformStatus', {
        id: (0, _classPrivateFieldGet2.default)(this, _kid)
      });
      if (!platformStatus || platformStatus[0].active) return true;else return false;
    }

    await Database.replace('platformStatus', {
      id: (0, _classPrivateFieldGet2.default)(this, _kid)
    }, {
      id: (0, _classPrivateFieldGet2.default)(this, _kid),
      active: active
    });
    return active;
  }
  /**
     * @description Gets the RSA public key assigned to the platform.
     *
     */


  async platformPublicKey() {
    const key = await Database.get('publickey', {
      kid: (0, _classPrivateFieldGet2.default)(this, _kid)
    }, true);
    return key[0].key;
  }
  /**
     * @description Gets the RSA private key assigned to the platform.
     *
     */


  async platformPrivateKey() {
    const key = await Database.get('privatekey', {
      kid: (0, _classPrivateFieldGet2.default)(this, _kid)
    }, true);
    return key[0].key;
  }
  /**
     * @description Sets/Gets the platform authorization configurations used to validate it's messages.
     * @param {string} method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
     * @param {string} key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
     */


  async platformAuthConfig(method, key) {
    if (!method && !key) return (0, _classPrivateFieldGet2.default)(this, _authConfig);
    if (method && method !== 'RSA_KEY' && method !== 'JWK_KEY' && method !== 'JWK_SET') throw new Error('INVALID_METHOD. Details: Valid methods are "RSA_KEY", "JWK_KEY", "JWK_SET".');
    const authConfig = {
      method: method || (0, _classPrivateFieldGet2.default)(this, _authConfig).method,
      key: key || (0, _classPrivateFieldGet2.default)(this, _authConfig).key
    };
    await Database.modify('platform', {
      platformUrl: (0, _classPrivateFieldGet2.default)(this, _platformUrl),
      clientId: (0, _classPrivateFieldGet2.default)(this, _clientId)
    }, {
      authConfig: authConfig
    });
    (0, _classPrivateFieldSet2.default)(this, _authConfig, authConfig);
    return authConfig;
  }
  /**
   * @description Sets/Gets the platform authorization endpoint used to perform the OIDC login.
   * @param {string} [authenticationEndpoint - Platform authentication endpoint.
   */


  async platformAuthenticationEndpoint(authenticationEndpoint) {
    if (!authenticationEndpoint) return (0, _classPrivateFieldGet2.default)(this, _authenticationEndpoint);
    await Database.modify('platform', {
      platformUrl: (0, _classPrivateFieldGet2.default)(this, _platformUrl),
      clientId: (0, _classPrivateFieldGet2.default)(this, _clientId)
    }, {
      authEndpoint: authenticationEndpoint
    });
    (0, _classPrivateFieldSet2.default)(this, _authenticationEndpoint, authenticationEndpoint);
    return authenticationEndpoint;
  }
  /**
     * @description Sets/Gets the platform access token endpoint used to authenticate messages to the platform.
     * @param {string} [accesstokenEndpoint] - Platform access token endpoint.
     */


  async platformAccessTokenEndpoint(accesstokenEndpoint) {
    if (!accesstokenEndpoint) return (0, _classPrivateFieldGet2.default)(this, _accesstokenEndpoint);
    await Database.modify('platform', {
      platformUrl: (0, _classPrivateFieldGet2.default)(this, _platformUrl),
      clientId: (0, _classPrivateFieldGet2.default)(this, _clientId)
    }, {
      accesstokenEndpoint: accesstokenEndpoint
    });
    (0, _classPrivateFieldSet2.default)(this, _accesstokenEndpoint, accesstokenEndpoint);
    return accesstokenEndpoint;
  }
  /**
     * @description Gets the platform access token or attempts to generate a new one.
     * @param {String} scopes - String of scopes.
     */


  async platformAccessToken(scopes) {
    const result = await Database.get('accesstoken', {
      platformUrl: (0, _classPrivateFieldGet2.default)(this, _platformUrl),
      clientId: (0, _classPrivateFieldGet2.default)(this, _clientId),
      scopes: scopes
    }, true);
    let token;

    if (!result || (Date.now() - result[0].createdAt) / 1000 > result[0].token.expires_in) {
      provPlatformDebug('Valid access_token for ' + (0, _classPrivateFieldGet2.default)(this, _platformUrl) + ' not found');
      provPlatformDebug('Attempting to generate new access_token for ' + (0, _classPrivateFieldGet2.default)(this, _platformUrl));
      provPlatformDebug('With scopes: ' + scopes);
      token = await Auth.generateAccessToken(scopes, this);
    } else {
      provPlatformDebug('Access_token found');
      token = result[0].token;
    }

    token.token_type = token.token_type.charAt(0).toUpperCase() + token.token_type.slice(1);
    return token;
  }
  /**
   * @description Retrieves the platform information as a JSON object.
   */


  async platformJSON() {
    const platformJSON = {
      id: (0, _classPrivateFieldGet2.default)(this, _kid),
      url: (0, _classPrivateFieldGet2.default)(this, _platformUrl),
      clientId: (0, _classPrivateFieldGet2.default)(this, _clientId),
      name: (0, _classPrivateFieldGet2.default)(this, _platformName),
      authenticationEndpoint: (0, _classPrivateFieldGet2.default)(this, _authenticationEndpoint),
      accesstokenEndpoint: (0, _classPrivateFieldGet2.default)(this, _accesstokenEndpoint),
      authConfig: (0, _classPrivateFieldGet2.default)(this, _authConfig),
      publicKey: await this.platformPublicKey(),
      active: await this.platformActive()
    };
    return platformJSON;
  }
  /**
   * @description Deletes a registered platform.
   */


  async delete() {
    await Database.delete('platform', {
      platformUrl: (0, _classPrivateFieldGet2.default)(this, _platformUrl),
      clientId: (0, _classPrivateFieldGet2.default)(this, _clientId)
    });
    await Database.delete('platformStatus', {
      id: (0, _classPrivateFieldGet2.default)(this, _kid)
    });
    await Database.delete('publickey', {
      kid: (0, _classPrivateFieldGet2.default)(this, _kid)
    });
    await Database.delete('privatekey', {
      kid: (0, _classPrivateFieldGet2.default)(this, _kid)
    });
    return true;
  }

}

module.exports = Platform;