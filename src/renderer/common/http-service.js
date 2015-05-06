'use babel';

let throws = require('../../common/throws');
let request = require('request');
let url = require('url');

class HttpService {
  constructor() {
    this.request = new HttpServiceRequest();
    this.response = new HttpServiceResponse();
    this.lastResponseTime = 0;
    this.lastDeliveryTime = 0;
    this._inProgress = false;

    this.request.headers.push(new HttpServiceHeader('Accept', 'application/vnd.scout.v1+json'));
    this.request.headers.push(new HttpServiceHeader('Accept-Language', 'en_US'));
    this.request.headers.push(new HttpServiceHeader('Authorization', 'token 765893158vb4381b583b7158v31834y58'));
    this.request.headers.push(new HttpServiceHeader('Date', '23/04/2015'));
    this.request.headers.push(new HttpServiceHeader('Content-Type', 'application/json'));
  }

  set inProgress(value) {
    if (this._inProgress == value) {
      return;
    }

    this._inProgress = value;
    //scout.currentWindow.setProgressBar(value ? 2 : 0);

    if (!value && !scout.currentWindow.isFocused()) {
      scout.currentWindow.flashFrame(true);
    }
  }

  get inProgress() {
    return this._inProgress;
  }

  sendRequest(callback) {
    if (this.inProgress) {
      return;
    }

    throws.ifEmpty(this.request.address, "address");
    throws.ifEmpty(this.request.method, "method");
    HttpService.httpMethodIsSupported(this.request.method, true);

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
      //body: HttpService.methodCanHaveBody(this.request.method) ? this.request.body : undefined,
      body: this.request.body,
      followRedirect: this.request.followRedirect,
      maxRedirects: this.request.maxRedirects || 10,
      timeout: this.request.timeout,
      time: true,
      useQuerystring: true,
      qs: HttpService.paramsToJson(this.request.urlParams)
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

    this.response.body = null;
    this.response.headers = [];
    this.response.status = 0;
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

class HttpServiceWrapper {
  constructor() {
    this.headers = [];
    this.body = null;
    this.raw = '';
  }

  addHeader(name, value) {
    throws.ifEmpty(name, "name");
    let header = this.findHeader(name);

    if (header !== null && header !== undefined) {
      header.value = value;
    } else {
      this.headers.push(new HttpServiceHeader(name, value));
    }
  }

  removeHeader(name) {
    let headerIndex = this.findHeaderIndex(name);
    if (headerIndex >= 0) {
      this.headers.splice(headerIndex, 1);
    }
  }

  findHeader(name) {
    for (let i = 0; i < this.headers.length; i++) {
      if (i in this.headers) {
        let header = this.headers[i];
        if (header.name === name) {
          return header;
        }
      }
    }

    return undefined;
  }

  findHeaderIndex(name) {
    for (let i = 0; i < this.headers.length; i++) {
      if (i in this.headers) {
        let header = this.headers[i];
        if (header.name === name) {
          return i;
        }
      }
    }

    return -1;
  }
}

class HttpServiceRequest extends HttpServiceWrapper {
  constructor() {
    super();
    this.method = 'get';
    this.address = '';
    this.urlParams = [];
    this.timeout = null;
    this.followRedirect = true;
    this.maxRedirects = 10;
  }

  addParameter(name, value) {
    throws.ifEmpty(name, "name");
    let param = this.findParameter(name);

    if (param !== null && param !== undefined) {
      param.value = value;
    } else {
      this.urlParams.push(new HttpServiceParameter(name, value));
    }
  }

  removeParameter(name) {
    let paramIndex = this.findParameterIndex(name);
    if (paramIndex >= 0) {
      this.urlParams.splice(paramIndex, 1);
    }
  }

  findParameter(name) {
    for (let i = 0; i < this.urlParams.length; i++) {
      if (i in this.urlParams) {
        let param = this.urlParams[i];
        if (param.name === name) {
          return param;
        }
      }
    }

    return undefined;
  }

  findParameterIndex(name) {
    for (let i = 0; i < this.urlParams.length; i++) {
      if (i in this.urlParams) {
        let parasm = this.urlParams[i];
        if (param.name === name) {
          return i;
        }
      }
    }

    return -1;
  }
}

class HttpServiceResponse extends HttpServiceWrapper {
  constructor() {
    super();
    this.status = 0;
  }
}

class HttpServiceEntity {
  constructor(name, value) {
    throws.ifEmpty(name, "name");
    this.name = name;
    this.value = value;
    this.include = true;
  }
}

class HttpServiceHeader extends HttpServiceEntity {
  constructor(name, value) {
    super(name, value);
  }
}

class HttpServiceParameter extends HttpServiceEntity {
  constructor(name, value) {
    super(name, value);
  }
}

module.exports = { HttpService, HttpServiceRequest, HttpServiceResponse };
