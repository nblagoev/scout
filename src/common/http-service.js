'use babel';

let throws = require('./throws');

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
}

class HttpServiceRequest {
  constructor() {
    this.headers = [];
    this.body = null;
  }

  addHeader(name, value) {
    throws.ifEmpty(name, "name");
    let header = this.findHeaderByName(name);

    if (header !== null && header !== undefined) {
      header.value = value;
    } else {
      this.headers.push(new HttpServiceHeader(name, value));
    }
  }

  removeHeader(name) {
    var headerIndex = this.findHeaderIndex(name);
    if (headerIndex >= 0) {
      this.headers.splice(headerIndex, 1);
    }
  }

  findHeader(name) {
    for (var i = 0; i < this.headers.length; i++) {
      if (i in this.headers) {
        var header = this.headers[i];
        if (header.name === name) {
          return header;
        }
      }
    }

    return undefined;
  }

  findHeaderIndex(name) {
    for (var i = 0; i < this.headers.length; i++) {
      if (i in this.headers) {
        var header = this.headers[i];
        if (header.name === name) {
          return i;
        }
      }
    }

    return -1;
  }
}

class HttpServiceResponse {
  constructor() {
    this.headers = {};
    this.body = null;
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
