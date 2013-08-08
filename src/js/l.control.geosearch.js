/*
 * L.Control.GeoSearch - search for an address and zoom to its location
 * https://github.com/smeijer/leaflet.control.geosearch
 */

L.GeoSearch = {};
L.GeoSearch.Provider = {};

// MSIE needs cors support
jQuery.support.cors = true;

L.GeoSearch.Result = function (x, y, label) {
  this.X = x;
  this.Y = y;
  this.Label = label;
};

L.Control.GeoSearch = L.Control.extend({
  options: {
    position: 'topleft'
  },

  initialize: function (options) {
    this._config = {};
    L.Util.extend(this.options, options);
    this._setConfig(options);
  },

  _setConfig: function (options) {
    this._config = {
      'provider': options.provider,
      'searchLabel': options.searchLabel || 'Enter address',
      'notFoundMessage' : options.notFoundMessage || 'Sorry, that address could not be found.',
      'zoomLevel': options.zoomLevel || 17,
      'showMarker': typeof options.showMarker !== 'undefined' ? options.showMarker : true,
    };
  },

  resetLink: function(extraClass) {
    var link = this._container.querySelector('a');
    link.className = 'leaflet-bar-part leaflet-bar-part-single' + ' ' + extraClass;
  },

  onAdd: function (map) {

    // create the container
    this._container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-geosearch');

    // create the link - this will contain one of the icons
    var link = L.DomUtil.create('a', '', this._container);
    link.href = '#';
    link.title = this._config.searchLabel;

    // set the link's icon to magnifying glass
    this.resetLink('glass');

    var displayNoneClass = 'displayNone';

    // create the form that will contain the input
    var form = L.DomUtil.create('form', displayNoneClass, this._container);

    // create the input, and set its placeholder ("Enter address") text
    var input = L.DomUtil.create('input', null, form);
    input.placeholder = this.options.searchLabel;
    this.searchInput = input;

    // create the error message div
    var message = L.DomUtil.create('div', 'leaflet-bar message displayNone', this._container);

    if (L.Browser.touch) {
      L.DomEvent.on(this._container, "click", L.DomEvent.stop);
    } else {
      L.DomEvent.disableClickPropagation(this._container);
      L.DomEvent.on(this._container, "mousewheel", L.DomEvent.stop);
    }

    L.DomEvent
      .on(link, 'click', L.DomEvent.stop)
      .on(link, 'click', function() {

        if (L.DomUtil.hasClass(form, displayNoneClass)) {
          L.DomUtil.removeClass(form, 'displayNone'); // unhide form
          $(input).select();
          $(input).focus();
          $(input).trigger("click");
        } else {
          L.DomUtil.addClass(form, 'displayNone'); // hide form
        }

      });

    // hide form when click on map
    L.DomEvent
      .on(this._map, "click", function(){
        if (!L.DomUtil.hasClass(form, displayNoneClass)) {
          L.DomUtil.addClass(form, 'displayNone'); // hide form
        }
      }, this);

    L.DomEvent
      .on(input, 'keypress', this._onKeyPress, this)
      .on(input, 'keyup', this._onKeyUp, this)
      .on(input, 'input', this._onInput, this);

    $(input).mouseup(function(e){
      e.preventDefault();
    });

    return this._container;
  },

  geosearch: function (qry) {
    try {
      var provider = this._config.provider;

      if(typeof provider.GetLocations === 'function') {
        var results = provider.GetLocations(qry, function(results) {
          this._processResults(results);
        }.bind(this));
      }
      else {
        var url = provider.GetServiceUrl(qry);

        $.getJSON(url, function (data) {
          try {
            var results = provider.ParseJSON(data);
            this._processResults(results);
          }
          catch (error) {
            this._printError(error);
          }
        }.bind(this));
      }
    }
    catch (error) {
      this._printError(error);
    }
  },

  _processResults: function(results) {
    if (results.length === 0)
      throw this._config.notFoundMessage;

    this._cancelSearch();
    this._showLocation(results[0]);
  },

  _showLocation: function (location) {
    if (this._config.showMarker) {
      if (typeof this._positionMarker === 'undefined')
        this._positionMarker = L.marker([location.Y, location.X]).addTo(this._map);
      else
        this._positionMarker.setLatLng([location.Y, location.X]);
    }

    this._map.setView([location.Y, location.X], this._config.zoomLevel, false);
  },

  _isShowingError: false,

  _printError: function(error) {
    var message = this._container.querySelector('.message');
    message.innerHTML = error;
    L.DomUtil.removeClass(message, 'displayNone');

    // show alert icon
    this.resetLink('alert');

    this._isShowingError = true;
  },

  _cancelSearch: function() {
    var form = this._container.querySelector('form');
    L.DomUtil.addClass(form, 'displayNone'); // hide form

    var input = form.querySelector('input');
    input.value = ''; // clear form

    // show glass icon
    this.resetLink('glass');

    var message = this._container.querySelector('.message');
    L.DomUtil.addClass(message, 'displayNone'); // hide message
  },

  _startSearch: function() {
    // show spinner icon
    this.resetLink('spinner');

    var input = this._container.querySelector('input');
    this.geosearch(input.value);
  },

  _onInput: function() {
    if (this._isShowingError) {
      // show glass icon
      this.resetLink('glass');

      var message = this._container.querySelector('.message');
      L.DomUtil.addClass(message, 'displayNone'); // hide message

      this._isShowingError = false;
    }
  },

  _onKeyPress: function (e) {
    var enterKey = 13;

    if (e.keyCode === enterKey) {
      L.DomEvent.preventDefault(e); // prevent default form submission

      this._startSearch();
    }
  },

  _onKeyUp: function (e) {
    var escapeKey = 27;
    var upArrow = 38;
    var downArrow = 40;

    if (e.keyCode === escapeKey) {
      this._cancelSearch();
    }
  }
});
