import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantAuth } from './restaurant-auth';

describe('RestaurantAuth', () => {
  let component: RestaurantAuth;
  let fixture: ComponentFixture<RestaurantAuth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantAuth],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantAuth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
