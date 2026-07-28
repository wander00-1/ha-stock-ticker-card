'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const { TITLE_SCHEMA, STOCK_SCHEMA } = require('../dist/ha-stock-ticker-card.js');

for (const [schemaName, schema] of [['TITLE_SCHEMA', TITLE_SCHEMA], ['STOCK_SCHEMA', STOCK_SCHEMA]]) {
  test(`${schemaName}: every field has a name, label, and selector`, () => {
    for (const field of schema) {
      assert.ok(field.name, `field missing name: ${JSON.stringify(field)}`);
      assert.ok(field.label, `${field.name} is missing a label`);
      assert.ok(field.selector, `${field.name} is missing a selector`);
    }
  });

  test(`${schemaName}: no duplicate field names`, () => {
    const names = schema.map(f => f.name);
    assert.equal(new Set(names).size, names.length, `${schemaName} has duplicate field names`);
  });
}

test('STOCK_SCHEMA: entity field targets the sensor domain', () => {
  const entityField = STOCK_SCHEMA.find(f => f.name === 'entity');
  assert.equal(entityField.selector.entity.domain, 'sensor');
});

test('STOCK_SCHEMA: number fields use null-friendly box mode (no default/required trap)', () => {
  for (const name of ['shares', 'purchase_price', 'brokerage_fee']) {
    const field = STOCK_SCHEMA.find(f => f.name === name);
    assert.equal(field.selector.number.mode, 'box');
  }
});
