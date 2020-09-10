import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ConnectMicroAppComponent} from './connect-micro-app.component';

describe('ConnectMicroAppComponent', () => {
  let component: ConnectMicroAppComponent;
  let fixture: ComponentFixture<ConnectMicroAppComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConnectMicroAppComponent ],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConnectMicroAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  /*
  params: add
   */
  it('should redirect to /add', async() => {
    const params = this.activatedRoute.snapshot.params;
    const app = fixture.componentInstance;
    expect(app.url).toBe(`connect/embedded/${params.integrationCategory}/pos`);
  })

  /*
  params: edit
   */
  it('should redirect to /edit', async() => {
    const params = this.activatedRoute.snapshot.params;
    const app = fixture.componentInstance;
    expect(app.url).toBe(`connect/embedded/${params.integrationCategory}/pos`);
  })


});
