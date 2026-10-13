const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const source = fs.readFileSync('src/services/locationService.js', 'utf8');
  const service = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const layoutSource = fs.readFileSync('src/utils/workspaceLayout.js', 'utf8');
  const layout = await import(`data:text/javascript;base64,${Buffer.from(layoutSource).toString('base64')}`);
  for (const width of [390, 360]) {
    const state = layout.getInitialSidebarState(width);
    assert.equal(state.mobileDrawerOpen, false);
    assert.equal(state.desktopSidebarOpen, false);
  }
  const desktopState = layout.getInitialSidebarState(1440);
  assert.equal(desktopState.desktopSidebarOpen, true);
  assert.equal(desktopState.mobileDrawerOpen, false);
  console.log('PASS 390px/360px start with closed mobile drawer; 1440px keeps desktop sidebar open');

  const originalFetch = global.fetch;
  let positionNumber = 0;
  const weatherCoordinates = [];
  global.fetch = async (input) => {
    const url = new URL(input);
    if (url.hostname.includes('bigdatacloud')) {
      return { ok: true, json: async () => ({ city: 'Mysuru', principalSubdivision: 'Karnataka', countryName: 'India' }) };
    }
    weatherCoordinates.push([url.searchParams.get('latitude'), url.searchParams.get('longitude')]);
    return { ok: true, json: async () => ({ current: { temperature_2m: 26.7, weather_code: 0 } }) };
  };

  Object.defineProperty(global, 'navigator', { configurable: true, value: { geolocation: {
    getCurrentPosition(success, failure, options) {
      assert.equal(options.enableHighAccuracy, true);
      assert.equal(options.maximumAge, 0);
      positionNumber += 1;
      const latitude = positionNumber === 1 ? 12.3 : 13.1;
      success({ coords: { latitude, longitude: 76.6 } });
    }
  } } });
  const first = await service.fetchRealUserLocation();
  const refreshed = await service.fetchRealUserLocation();
  assert.equal(first.success, true);
  assert.equal(first.formattedLocation, 'Mysuru, Karnataka, India');
  assert.equal(first.temp, 27);
  assert.equal(refreshed.latitude, 13.1);
  assert.deepEqual(weatherCoordinates, [['12.3', '76.6'], ['13.1', '76.6']]);
  console.log('PASS fresh browser coordinates update location and weather coordinates');

  Object.defineProperty(global, 'navigator', { configurable: true, value: { geolocation: {
    getCurrentPosition(success, failure) { failure({ code: 1 }); }
  } } });
  const denied = await service.fetchRealUserLocation();
  assert.equal(denied.success, false);
  assert.equal(denied.permissionDenied, true);
  assert.equal(denied.city, undefined);
  console.log('PASS denied permission -> unavailable with no city fallback');

  Object.defineProperty(global, 'navigator', { configurable: true, value: { geolocation: {
    getCurrentPosition(success, failure) { failure({ code: 3 }); }
  } } });
  const timedOut = await service.fetchRealUserLocation();
  assert.match(timedOut.error, /timed out/i);
  console.log('PASS geolocation timeout -> retryable unavailable state');

  global.fetch = async () => { throw new Error('network down'); };
  Object.defineProperty(global, 'navigator', { configurable: true, value: { geolocation: {
    getCurrentPosition(success) { success({ coords: { latitude: 12.3, longitude: 76.6 } }); }
  } } });
  const reverseFailure = await service.fetchRealUserLocation();
  assert.equal(reverseFailure.success, false);
  assert.equal(reverseFailure.city, undefined);
  console.log('PASS reverse-geocode failure -> no false location');
  global.fetch = originalFetch;
})().catch((error) => { console.error(error); process.exit(1); });
