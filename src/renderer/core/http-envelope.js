'use babel';

import url from 'url';
import request from 'request';
import * as throws from '../../common/throws';
import symbols from "../../common/symbol-stream";
import {CompositeDisposable, Disposable, Emitter} from 'event-kit';

const [_request, _response, _inProgress] = [...symbols(3)];

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

    throws.ifEmpty(this.request.address, "address");
    throws.ifEmpty(this.request.method, "method");
    HttpEnvelope.httpMethodIsSupported(this.request.method, true);

    this.inProgress = true;
    let targetUrl = url.parse(this.request.address);

    if (!targetUrl.protocol) {
      targetUrl = url.parse('https://' + this.request.address);
    }

    throws.ifEmpty(targetUrl.hostname, "hostname");

    let options = {
      url: targetUrl,
      method: this.request.method.toUpperCase(),
      headers: {},
      //body: HttpEnvelope.methodCanHaveBody(this.request.method) ? this.request.body : undefined,
      body: this.request.body,
      followRedirect: this.request.followRedirect,
      maxRedirects: this.request.maxRedirects || 10,
      timeout: this.request.timeout,
      time: true,
      useQuerystring: true,
      qs: HttpEnvelope.paramsToJson(this.request.urlParams)
    };

    let headers = this.request.headers;
    for (let i = 0; i < headers.length; i++) {
      if (i in headers) {
        let header = headers[i];
        if (header.include === true) {
          options.headers[header.name] = header.value;
        }
      }
    }

    this.response.clear();
    this.lastResponseTime = 0;
    this.lastDeliveryTime = 0;

    let startTime = Date.now();
    request(options, (error, res, body) => {
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
    this.body = null;
    this.raw = '';
  }

  clear() {
    this.headers = [];
    this.body = null;
    this.raw = '';
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

  addHeader(name, value) {
    throws.ifEmpty(name, "name");
    let {header} = this.findHeader(h => h.name === name);

    if (header !== null && header !== undefined) {
      header.value = value;
    } else {
      this.headers.push(new HttpHeader(name, value));
    }
  }

  removeHeader(name) {
    let {index} = this.findHeader(h => h.name === name);
    if (index >= 0) {
      this.headers.splice(index, 1);
    }
  }

  findHeader(predicate) {
    for (let [index, header] of this.headers.entries()) {
      if (typeof(predicate) == "function" && predicate(header) || header.name === predicate) {
        return { header, index };
      }
    }

    return { header: undefined, index: -1 };
  }
}

class HttpRequest extends HttpEnvelopePart {
  constructor() {
    super();
    this.method = 'get';
    this.address = '';
    this.urlParams = [];
    this.timeout = null;
    this.followRedirect = true;
    this.maxRedirects = 10;
  }

  clear() {
    super.clear();
    this.method = 'get';
    this.address = '';
    this.urlParams = [];
    this.timeout = null;
    this.followRedirect = true;
    this.maxRedirects = 10;
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
    this.status = 0;
  }

  clear() {
    super.clear();
    this.status = 0;
  }
}

class HttpEnvelopeEntity {
  constructor(name, value) {
    throws.ifEmpty(name, "name");
    this.name = name;
    this.value = value;
    this.include = true;
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
