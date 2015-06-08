'use babel';

import url from 'url';
import request from 'request';
import _ from 'underscore-plus';
import * as throws from '../../common/throws';
import symbols from "../../common/symbol-stream";
import {CompositeDisposable, Disposable, Emitter} from 'event-kit';

const [_request, _response, _inProgress, _type] = [...symbols(4)];

/**
 * An instance of this class is always available as the `scout.envelope` global.
 */
export default class HttpEnvelope {
  constructor() {
    this[_request] = new HttpRequest();
    this[_response] = new HttpResponse();
    this.emitter = new Emitter();
    this.lastResponseTime = 0;
    this.lastDeliveryTime = 0;
    this.inProgress = false;
  }

  get request() {
    return this[_request];
  }

  get response() {
    return this[_response];
  }

  set inProgress(value) {
    if (this[_inProgress] == value) {
      return;
    }

    this[_inProgress] = value;
    //scout.currentWindow.setProgressBar(value ? 2 : 0);

    if (!value && !scout.currentWindow.isFocused()) {
      scout.currentWindow.flashFrame(true);
    }
  }

  get inProgress() {
    return this[_inProgress];
  }

  sendRequest(callback) {
    if (this.inProgress) {
      return;
    }

    this.inProgress = true;
    this.response.clear();
    this.lastResponseTime = 0;
    this.lastDeliveryTime = 0;

    let startTime = Date.now();
    request(this.request.toJSON(), (error, res, body) => {
      if (error) {
        let message = "Could not send request";
        let detail = null;

        switch (error.code) {
          case "ENOTFOUND":
            message = `Host ${error.host}:${error.port} is unreachable`;
            break;
          case "ESOCKETTIMEDOUT":
          case "ETIMEDOUT":
            message = "Connection timed out. Try to increase the timeout option in the Request panel."
            break;
          default:
            detail = error.message;
        }

        scout.notifications.addError(message, {detail});
      } else {
        this.lastDeliveryTime = res.elapsedTime;
        //res.setEncoding('utf8');
      }

      this.inProgress = false;
      scout.history.add(this);
      callback();
    }).on('response', (res) => {
      this.lastResponseTime = Date.now() - startTime;
      this.response.status = res.statusCode;

      let hlen = res.rawHeaders.length;
      for (let i = 0; i < hlen; i++) {
        let name = res.rawHeaders[i];
        let value = res.rawHeaders[++i];
        this.response.addHeader(name, value);
      }

      callback();
    }).on('data', (chunk) => {
      if (this.response.body == null || this.response.body == undefined) {
        this.response.body = '';
      }

      this.response.body += chunk.toString();
    }).on('socket', (socket) => {
      this.response.raw = '';
      socket.resume();
      socket.on('data', (buf) => {
        this.response.raw += buf.toString();
      });
    }).on('end', () => {
      callback();
    });
  }

  serialize() {
    return {
      request: this.request.serialize(),
      response: this.response.serialize(),
      lastResponseTime: this.lastResponseTime,
      lastDeliveryTime: this.lastDeliveryTime
    };
  }

  deserialize(envelope) {
    this.request.deserialize(envelope.request);
    this.response.deserialize(envelope.response);
    this.lastResponseTime = envelope.lastResponseTime || 0;
    this.lastDeliveryTime = envelope.lastDeliveryTime || 0;
  }

  static httpMethodIsSupported(method, throwError) {
    let supported = ["GET", "PUT", "POST", "DELETE"];
    let result = supported.indexOf(method.toUpperCase()) !== -1;

    if (throwError === true && !result) {
      throw new Error("Unsupported HTTP method " + method);
    } else {
      return result;
    }
  }

  static methodCanHaveBody(method, throwError) {
    let canHaveBody = ["PUT", "POST", "PATCH"];
    let result = canHaveBody.indexOf(method.toUpperCase()) !== -1;

    if (throwError === true && !result) {
      throw new Error("HTTP method " + method + " cannot have body");
    } else {
      return result;
    }
  }

  static paramsToJson(urlParams) {
    let result = {};

    for (let i = 0; i < urlParams.length; i++) {
      if (i in urlParams) {
        let param = urlParams[i];
        if (param.include === true) {
          result[param.name] = param.value;
        }
      }
    }

    return result;
  }
}

class HttpEnvelopePart {
  constructor() {
    this.headers = [];
  }

  clear() {
    this.headers = [];
  }

  /**
   * @param {string|array} properties - A list of property names that will be
   *        observed. Value of '*' will trigger the callback when changes occur to
   *        any of the {HttpEnvelopePart}'s properties.
   *
   * @param {function(changes)} callback - A function to be called when a change occurs.
   *
   * @returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
   */
  onDidChange(properties, callback) {
    let observer = (changes) => {
      if (properties === "*") {
        callback(changes);
      } else {
        let filteredChanges = changes.filter(change => properties.indexOf(change.name) >= 0);

        if (filteredChanges && filteredChanges.length > 0) {
          callback(filteredChanges);
        }
      }
    };

    Object.observe(this, observer, ["update"]);
    return new Disposable(() => Object.unobserve(this, observer));
  }

  addHeader(name, value, options = {}) {
    throws.ifEmpty(name, "name");
    let {header} = this.findHeader(name);

    if (header !== null && header !== undefined) {
      if (options.ignoreExisting === true) {
        return;
      }

      header.value = value;
    } else {
      this.headers.push(new HttpHeader(name, value));
    }
  }

  removeHeader(name) {
    let {index} = this.findHeader(name);
    if (index >= 0) {
      this.headers.splice(index, 1);
    }
  }

  findHeader(predicate) {
    for (let [index, header] of this.headers.entries()) {
      if (typeof(predicate) == "function" && predicate(header) ||
          typeof(predicate) == "string" && header.name.toLowerCase() === predicate.toLowerCase()) {
        return { header, index };
      }
    }

    return { header: undefined, index: -1 };
  }
}

class HttpRequest extends HttpEnvelopePart {
  constructor() {
    super();
    this.body = new HttpRequestBody();
    this.method = 'get';
    this.address = '';
    this.urlParams = [];
    this.timeout = null;
    this.followRedirect = true;
    this.maxRedirects = 10;
  }

  clear() {
    super.clear();
    this.body.clear();
    this.method = 'get';
    this.address = '';
    this.urlParams = [];
    this.timeout = null;
    this.followRedirect = true;
    this.maxRedirects = 10;
  }

  toJSON() {
    HttpEnvelope.httpMethodIsSupported(this.method, true);
    let targetUrl = url.parse(this.address);

    if (!targetUrl.protocol) {
      targetUrl = url.parse('https://' + this.address);
    }

    let result = {
      url: targetUrl,
      method: this.method.toUpperCase(),
      headers: {},
      //body: HttpEnvelope.methodCanHaveBody(this.method) ? this.body.toString() : undefined,
      body: this.body.toString(),
      followRedirect: this.followRedirect,
      maxRedirects: this.maxRedirects || 10,
      timeout: this.timeout,
      time: true,
      useQuerystring: true,
      qs: HttpEnvelope.paramsToJson(this.urlParams)
    };

    let headers = this.headers;
    for (let i = 0; i < headers.length; i++) {
      if (i in headers) {
        let header = headers[i];
        if (header.include === true) {
          result.headers[header.name] = header.value;
        }
      }
    }

    if (!result.headers.hasOwnProperty('User-Agent')) {
      let userAgent = navigator.userAgent;
      let lastScoutIndex = userAgent.lastIndexOf("Scout");
      userAgent = userAgent.substring(0, lastScoutIndex) + "Electron" + userAgent.substring(lastScoutIndex + 5);
      result.headers['User-Agent'] = userAgent;
    }

    return result;
  }

  toRaw() {
    let json = this.toJSON();

    if (!json.url.path || !json.method) {
      return '';
    }

    let result = `${json.method} ${json.url.path} HTTP/1.1\r\n`;

    for (let key in json.headers) {
      if (json.headers.hasOwnProperty(key)) {
        let value = json.headers[key];
        result += `${key}: ${value}\r\n`;
      }
    }

    if (json.url.hostname && this.findHeader('Host').index < 0) {
      if (json.url.port &&
          !(json.url.port === 80 && json.url.protocol === 'http:') &&
          !(json.url.port === 443 && json.url.protocol === 'https:')) {
        result += `Host: ${json.url.hostname}:${json.url.port}\r\n`;
      } else {
        result += `Host: ${json.url.hostname}\r\n`;
      }
    }

    if (json.method !== 'GET' && typeof json.method !== 'undefined' &&
        this.findHeader('Content-Length').index < 0 && json.body) {
      result += `Content-Length: ${json.body.length}\r\n`;
    }

    if (this.findHeader('Connection').index < 0) {
      result += 'Connection: close\r\n';
    }

    if (json.body && json.body.length > 0) {
      result += `\r\n${json.body}`;
    }

    return result;
  }

  serialize() {
    return {
      method: this.method,
      address: this.address,
      urlParams: this.urlParams.map(p => p.serialize()),
      headers: this.headers.map(h => h.serialize()),
      body: this.body.serialize(),
      timeout: this.timeout,
      followRedirect: this.followRedirect,
      maxRedirects: this.maxRedirects
    }
  }

  deserialize(requestObj) {
    this.clear();

    if (requestObj.method) {
      this.method = requestObj.method;
    }

    if (requestObj.address) {
      this.address = requestObj.address;
    }

    if (requestObj.urlParams && _.isArray(requestObj.urlParams)) {
      this.urlParams = requestObj.urlParams;
    }

    if (requestObj.headers && _.isArray(requestObj.headers)) {
      this.headers = [];
      for (let header of requestObj.headers) {
        throws.ifEmpty(header.name, "name");
        this.headers.push({
          name: header.name,
          value: header.value,
          include: header.include
        });
      }
    }

    if (requestObj.body) {
      this.body.deserialize(requestObj.body);
    }

    if (requestObj.timeout && requestObj.timeout > 0) {
      this.timeout = requestObj.timeout;
    }

    if (requestObj.followRedirect && _.isBoolean(requestObj.followRedirect)) {
      this.followRedirect = requestObj.followRedirect;
    }

    if (requestObj.maxRedirects && requestObj.maxRedirects > 0) {
      this.maxRedirects = requestObj.maxRedirects;
    }
  }

  addParameter(name, value) {
    throws.ifEmpty(name, "name");
    let {parameter} = this.findParameter(p => p.name === name);

    if (parameter !== null && parameter !== undefined) {
      parameter.value = value;
    } else {
      this.urlParams.push(new HttpParameter(name, value));
    }
  }

  removeParameter(name) {
    let {index} = this.findParameter(p => p.name === name);
    if (index >= 0) {
      this.urlParams.splice(index, 1);
    }
  }

  findParameter(predicate) {
    for (let [index, parameter] of this.urlParams.entries()) {
      if (predicate(parameter)) {
        return { parameter, index };
      }
    }

    return { parameter: undefined, index: -1 };
  }
}

class HttpResponse extends HttpEnvelopePart {
  constructor() {
    super();
    this.body = null;
    this.status = 0;
    this.raw = '';
  }

  clear() {
    super.clear();
    this.body = null;
    this.status = 0;
    this.raw = '';
  }

  serialize() {
    return {
      status: this.status,
      raw: this.raw,
      headers: this.headers.map(h => h.serialize()),
      body: this.body
    }
  }

  deserialize(responseObj) {
    this.clear();

    if (responseObj.status && responseObj.status > 0) {
      this.status = responseObj.status;
    }

    if (responseObj.raw) {
      this.raw = responseObj.raw;
    }

    if (responseObj.headers && _.isArray(responseObj.headers)) {
      this.headers = [];
      for (let header of responseObj.headers) {
        throws.ifEmpty(header.name, "name");
        this.headers.push({
          name: header.name,
          value: header.value,
          include: header.include
          });
      }
    }

    if (responseObj.body) {
      this.body = responseObj.body;
    }
  }
}

class HttpRequestBody {
  constructor() {
    this[_type] = 'text';
    this.value = '';
  }

  serialize() {
    let value = null;
    if (this.type === 'text') {
      value = this.value;
    } else if (this.type === 'urlencoded') {
      value = this.value.serialize();
    } else {
      scout.notifications.addError('Cannot serialize body', {detail: `Unsupported body type: ${this.type}`});
    }

    return { type: this.type, value };
  }

  deserialize(bodyObj) {
    if (bodyObj.type === 'text') {
      this.value = bodyObj.value;
    } else if (bodyObj.type === 'urlencoded') {
      this.value = new UrlEncodedHttpRequestBody();
      this.value.deserialize(bodyObj.value);
    } else {
      scout.notifications.addError('Cannot deserialize body', {detail: `Unsupported body type: ${bodyObj.type}`});
    }
  }

  set type(value) {
    if (this[_type] === value) {
      return;
    }

    let initializeValue = () => {
      if (value === 'text') {
        this.value = '';
      } else if (value === 'urlencoded') {
        this.value = new UrlEncodedHttpRequestBody();
      } else {
        scout.notifications.addError(`Unsupported body type: ${value}`);
      }
    };

    if (_.isEmpty(this.value) || (this.value.length != null && this.value.length == 0)) {
      initializeValue();
      this[_type] = value;
      return;
    }

    scout.confirm({
      'message': 'Change the body type?',
      'detailedMessage': 'The current body content will be lost.',
      'buttons': {
        'Change': () => {
          initializeValue();
          this[_type] = value;
        },
        'Cancel': () => {}
      }
    });
  }

  get type() {
    return this[_type];
  }

  clear() {
    this.type = 'text';
    this.value = '';
  }

  toString() {
    if (this.type === 'text') {
      return this.value;
    } else {
      scout.notifications.addError(`Unsupported body type: ${this.type}`);
    }
  }
}

class UrlEncodedHttpRequestBody {
  constructor() {
    this.pairs = [];
  }

  get length() {
    return this.pairs.length;
  }

  add(key, value) {
    throws.ifEmpty(key, "key");
    let {pair} = this.find(p => p.key === key);

    if (pair !== null && pair !== undefined) {
      pair.value = value;
    } else {
      this.pairs.push({key, value, include: true});
    }
  }

  remove(key) {
    let {index} = this.find(p => p.key === key);
    if (index >= 0) {
      this.pairs.splice(index, 1);
    }
  }

  find(predicate) {
    for (let [index, pair] of this.pairs.entries()) {
      if (predicate(pair)) {
        return { pair, index };
      }
    }

    return { pair: undefined, index: -1 };
  }

  serialize() {
    return pairs.map(p => ({ key: p.key, value: p.value, include: p.include }));
  }

  deserialize(pairsObj) {
    this.pairs = [];
    for (let pair of pairsObj.pairs) {
      throws.ifEmpty(pair.key, "key");
      this.pairs.push({ key: pair.key, value: pair.value, include: pair.include });
    }
  }
}

class HttpEnvelopeEntity {
  constructor(name, value) {
    throws.ifEmpty(name, "name");
    this.name = name;
    this.value = value;
    this.include = true;
  }

  serialize() {
    return {
      include: this.include,
      name: this.name,
      value: this.value
    };
  }

  deserialize(entityObj) {
    throws.ifEmpty(entityObj.name, "name");
    this.include = entityObj.include;
    this.name = entityObj.name;
    this.value = entityObj.value;
  }
}

class HttpHeader extends HttpEnvelopeEntity {
  constructor(name, value) {
    super(name, value);
  }
}

class HttpParameter extends HttpEnvelopeEntity {
  constructor(name, value) {
    super(name, value);
  }
}
