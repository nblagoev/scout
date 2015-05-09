'use babel';

let _ = require('underscore-plus');

beforeEach(() => {
  jasmine.getEnv().addCustomEqualityTester(_.isEqual); // Use underscore's definition of equality for toEqual assertions
});
