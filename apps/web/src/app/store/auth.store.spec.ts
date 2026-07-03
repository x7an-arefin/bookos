import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthStore } from './auth.store';
import { IndexedDbService } from '../shared/services/indexed-db.service';

describe('AuthStore', () => {
  let store: InstanceType<typeof AuthStore>;
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: IndexedDbService, useValue: dbMock },
      ],
    });
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('initial state', () => {
    it('starts unauthenticated', () => {
      expect(store.isAuthenticated()).toBe(false);
      expect(store.userId()).toBeNull();
      expect(store.jwt()).toBeNull();
    });

    it('starts on the free plan', () => {
      expect(store.plan()).toBe('free');
      expect(store.isPremium()).toBe(false);
      expect(store.isProPlan()).toBe(false);
      expect(store.isAuthorPlan()).toBe(false);
    });

    it('isLoading starts false', () => {
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('seedLocalUser()', () => {
    it('sets userId to local-user', () => {
      store.seedLocalUser();
      expect(store.userId()).toBe('local-user');
    });

    it('marks store as authenticated', () => {
      store.seedLocalUser();
      expect(store.isAuthenticated()).toBe(true);
    });

    it('keeps plan as free', () => {
      store.seedLocalUser();
      expect(store.plan()).toBe('free');
      expect(store.isPremium()).toBe(false);
    });

    it('sets displayName to Local Author', () => {
      store.seedLocalUser();
      expect(store.displayName()).toBe('Local Author');
    });
  });

  describe('setAuthState()', () => {
    it('upgrades plan to author', () => {
      store.setAuthState({ userId: 'u1', plan: 'author' });
      expect(store.plan()).toBe('author');
      expect(store.isAuthorPlan()).toBe(true);
      expect(store.isPremium()).toBe(true);
      expect(store.isProPlan()).toBe(false);
    });

    it('upgrades plan to pro', () => {
      store.setAuthState({ userId: 'u2', plan: 'pro' });
      expect(store.plan()).toBe('pro');
      expect(store.isProPlan()).toBe(true);
      expect(store.isAuthorPlan()).toBe(true);
    });

    it('sets email and jwt', () => {
      store.setAuthState({ email: 'me@example.com', jwt: 'tok.abc.xyz' });
      expect(store.email()).toBe('me@example.com');
      expect(store.jwt()).toBe('tok.abc.xyz');
    });
  });

  describe('logout()', () => {
    it('clears all auth state', () => {
      store.seedLocalUser();
      store.logout();
      expect(store.isAuthenticated()).toBe(false);
      expect(store.userId()).toBeNull();
      expect(store.plan()).toBe('free');
    });

    it('is idempotent when called twice', () => {
      store.logout();
      store.logout();
      expect(store.isAuthenticated()).toBe(false);
    });
  });

  describe('computed: isAuthorPlan', () => {
    it('is true for both author and pro tiers', () => {
      store.setAuthState({ plan: 'author' });
      expect(store.isAuthorPlan()).toBe(true);

      store.setAuthState({ plan: 'pro' });
      expect(store.isAuthorPlan()).toBe(true);
    });

    it('is false for free tier', () => {
      store.setAuthState({ plan: 'free' });
      expect(store.isAuthorPlan()).toBe(false);
    });
  });
});
