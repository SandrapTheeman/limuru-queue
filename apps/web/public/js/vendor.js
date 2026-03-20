/**
 * Vendor JS Bundle
 * Contains common third-party code and utilities shared across all pages
 * Load this first with defer attribute
 */

// Common utility functions
const Utils = {
  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  throttle: function(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  formatDate: function(date) {
    return new Date(date).toLocaleDateString();
  },
  
  formatTime: function(time) {
    return new Date(time).toLocaleTimeString();
  },
  
  formatDateTime: function(dateTime) {
    return new Date(dateTime).toLocaleString();
  },
  
  getQueryParam: function(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },
  
  setCookie: function(name, value, days) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
  },
  
  getCookie: function(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  },
  
  removeCookie: function(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
  },
  
  showNotification: function(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => container.removeChild(notification), 300);
    }, duration);
  },
  
  loading: function(show = true) {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  }
};

function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;';
  document.body.appendChild(container);
  return container;
}

// Polyfills if needed
if (!Array.prototype.includes) {
  Array.prototype.includes = function(search, start) {
    'use strict';
    if (this == null) throw new TypeError('Array.prototype.includes called on null or undefined');
    var O = Object(this);
    var len = parseInt(O.length) || 0;
    if (len === 0) return false;
    var n = parseInt(arguments[1]) || 0;
    var k;
    if (n >= 0) k = n;
    else { k = len + n; if (k < 0) k = 0; }
    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (search === currentElement || (search !== search && currentElement !== currentElement)) return true;
      k++;
    }
    return false;
  };
}

if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    'use strict';
    if (this == null) throw new TypeError('String.prototype.includes called on null or undefined');
    var O = Object(this);
    var s = String(O);
    var ar = arguments;
    var len = s.length;
    var pos = typeof start === 'undefined' ? 0 : (Number(start) || 0);
    if (pos < 0) pos = 0;
    if (pos + search.length > len) return false;
    return s.indexOf(search, pos) !== -1;
  };
}

// Export for use in other scripts
window.Utils = Utils;
window.debounce = Utils.debounce;
window.throttle = Utils.throttle;