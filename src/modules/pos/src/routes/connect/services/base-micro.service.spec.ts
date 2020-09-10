import {TestBed} from '@angular/core/testing';

import {BaseMicroService} from './base-micro.service';

describe('BaseMicroService', () => {
  let baseMicroService: BaseMicroService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BaseMicroService],
    });
    baseMicroService = TestBed.inject(BaseMicroService);
  });
  /*
  * Function of scripts loading from micro service
  */
  it('should load script', (done) => {
    const baseMicroServiceSpy =
      jasmine.createSpyObj('BaseMicroService', ['loadScript']).subscribe(() => {
        const script: HTMLScriptElement = this.renderer.createElement('script');
        baseMicroServiceSpy.loadScript.and.returnValue(script);
        done();
      });
  });

  it('should mark script as loaded', () => {
    expect(baseMicroService.isScriptLoaded).toBe(true);
  });

  it('should check script as loaded by code', (done) => {
    baseMicroService.isScriptLoadedbyCode((code) => {
      expect(code).toBe(true);
      done();
    });
  });

  it('should unload script', (done) => {
    baseMicroService.scriptLoaded$.subscribe((value) => {
      expect(value).not.toBe(true);
      done();
    });
  });
});
