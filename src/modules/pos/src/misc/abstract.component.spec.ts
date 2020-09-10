import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {ReplaySubject} from 'rxjs';

import {AbstractComponent} from './abstract.component';


describe('AbstractComponent', () => {
  let component: AbstractComponent;
  let fixture: ComponentFixture<AbstractComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AbstractComponent ],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AbstractComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /*
  *   COMPONENT BEFORE INIT
  */

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should set instance correctly', () => {
    expect(AbstractComponent).not.toBeNull();
  });

  /*
  *   COMPONENT BEFORE DESTROY
  */

  it('should destroy element in component', async() => {
    const destroyed$ = new ReplaySubject<boolean>();
    expect(destroyed$).toBeFalse();
    fixture.detectChanges();
    destroyed$.complete();
  });
});
