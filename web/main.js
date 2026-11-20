import { initPlaces } from './places.js';
import { initAuth } from './auth.js';
import { initOffers } from './offers.js';

initPlaces();

initAuth(initOffers());
