#!/bin/bash
set -e

zuul -v --ui mocha-qunit --local 3333 -- test/index.js
