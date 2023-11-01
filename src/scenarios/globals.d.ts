/* eslint-disable @typescript-eslint/no-unused-vars */
import Runtime = __rt.Runtime;
import utils = __rt.utils;
import Service = __rt.Service;
import console = __rt.console;
import setTimeout = __rt.setTimeout;
import clearTimeout = __rt.clearTimeout;
import delay = __rt.delay;
import spin = __rt.spin;
import expect = __rt.expect;
import logger = __rt.logger;
import metrics = __rt.metrics;
import random = __rt.random;
import context = __rt.context;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const services: Record<string, Record<string, (...args: any[]) => any>>;
