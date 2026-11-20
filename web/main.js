import { initPlaces } from './places.js';
import { initAuth } from './auth.js';
import { initOffers } from './offers.js';

const page = document.body.dataset.page;
if (page === 'places') initPlaces();
if (page === 'offers' || page === 'activity') {
  initAuth(initOffers());
} else {
  initAuth();
}
