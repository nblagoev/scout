'use babel';

let throws = require('./throws');
let http = require('http');
let url = require('url');

class HttpService {
  constructor() {
    this.request = new HttpServiceRequest();
    this.response = new HttpServiceResponse();

    this.request.headers.push(new HttpServiceHeader('Accept', 'application/vnd.scout.v1+json'));
    this.request.headers.push(new HttpServiceHeader('Accept-Language', 'en_US'));
    this.request.headers.push(new HttpServiceHeader('Authorization', 'token 765893158vb4381b583b7158v31834y58'));
    this.request.headers.push(new HttpServiceHeader('Date', '23/04/2015'));
    this.request.headers.push(new HttpServiceHeader('Content-Type', 'application/json'));
  }

  sendRequest(method, address, callback) {
    throws.ifEmpty(address);
    throws.ifEmpty(method);
    HttpService.httpMethodIsSupported(method, true);

    let targetUrl = url.parse(address);

    throws.ifEmpty(targetUrl.hostname);
    throws.ifEmpty(targetUrl.port);
    throws.ifEmpty(targetUrl.path);

    let options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: targetUrl.path,
      method: method.toUpperCase(),
      headers: {}
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

    if (!options.headers['Content-Length'] && this.request.body) {
      options.headers['Content-Length'] = this.request.body;
    }

    if (targetUrl.protocol === "http:") {
      let req = http.request(options, (res) => {
        this.response.status = res.statusCode;

        for (let name in res.headers) {
          this.response.addHeader(name, res.headers[name]);
        }

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          this.response.body = chunk;
          callback();
        });

        callback();
      });

      req.on('error', (e) => {
        throw new Error (e.message);
      });

      if (this.request.body !== null && this.request.body !== undefined) {
        req.write(this.request.body);
      }

      req.end();
    } else {
      throw new Error("Unsupported protocol " + targetUrl.protocol);
    }
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
}

class HttpServiceWrapper {
  constructor() {
    this.headers = [];
    this.body = null;
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
  }
}

class HttpServiceResponse extends HttpServiceWrapper {
  constructor() {
    super();
    this.status = 0;
  }
}

class HttpServiceHeader {
  constructor(name, value) {
    throws.ifEmpty(name, "name");
    this.name = name;
    this.value = value;
    this.include = true;
  }
}

module.exports = { HttpService, HttpServiceRequest, HttpServiceResponse, HttpServiceHeader };
