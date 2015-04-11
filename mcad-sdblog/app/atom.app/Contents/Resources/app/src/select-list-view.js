(function() {
  var $, SelectListView, TextEditorView, View, fuzzyFilter, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('./space-pen-extensions'), $ = _ref.$, View = _ref.View;

  TextEditorView = require('./text-editor-view');

  fuzzyFilter = require('fuzzaldrin').filter;

  module.exports = SelectListView = (function(_super) {
    __extends(SelectListView, _super);

    function SelectListView() {
      return SelectListView.__super__.constructor.apply(this, arguments);
    }

    SelectListView.content = function() {
      return this.div({
        "class": 'select-list'
      }, (function(_this) {
        return function() {
          _this.subview('filterEditorView', new TextEditorView({
            mini: true
          }));
          _this.div({
            "class": 'error-message',
            outlet: 'error'
          });
          _this.div({
            "class": 'loading',
            outlet: 'loadingArea'
          }, function() {
            _this.span({
              "class": 'loading-message',
              outlet: 'loading'
            });
            return _this.span({
              "class": 'badge',
              outlet: 'loadingBadge'
            });
          });
          return _this.ol({
            "class": 'list-group',
            outlet: 'list'
          });
        };
      })(this));
    };

    SelectListView.prototype.maxItems = Infinity;

    SelectListView.prototype.scheduleTimeout = null;

    SelectListView.prototype.inputThrottle = 50;

    SelectListView.prototype.cancelling = false;


    /*
    Section: Construction
     */

    SelectListView.prototype.initialize = function() {
      this.filterEditorView.getEditor().getBuffer().onDidChange((function(_this) {
        return function() {
          return _this.schedulePopulateList();
        };
      })(this));
      this.filterEditorView.on('blur', (function(_this) {
        return function() {
          if (!_this.cancelling) {
            return _this.cancel();
          }
        };
      })(this));
      this.list.on('mousedown', (function(_this) {
        return function(_arg) {
          var target;
          target = _arg.target;
          if (target === _this.list[0]) {
            return false;
          }
        };
      })(this));
      this.on('core:move-up', (function(_this) {
        return function() {
          return _this.selectPreviousItemView();
        };
      })(this));
      this.on('core:move-down', (function(_this) {
        return function() {
          return _this.selectNextItemView();
        };
      })(this));
      this.on('core:move-to-top', (function(_this) {
        return function() {
          _this.selectItemView(_this.list.find('li:first'));
          _this.list.scrollToTop();
          return false;
        };
      })(this));
      this.on('core:move-to-bottom', (function(_this) {
        return function() {
          _this.selectItemView(_this.list.find('li:last'));
          _this.list.scrollToBottom();
          return false;
        };
      })(this));
      this.on('core:confirm', (function(_this) {
        return function() {
          return _this.confirmSelection();
        };
      })(this));
      this.on('core:cancel', (function(_this) {
        return function() {
          return _this.cancel();
        };
      })(this));
      this.list.on('mousedown', 'li', (function(_this) {
        return function(e) {
          _this.selectItemView($(e.target).closest('li'));
          return e.preventDefault();
        };
      })(this));
      return this.list.on('mouseup', 'li', (function(_this) {
        return function(e) {
          if ($(e.target).closest('li').hasClass('selected')) {
            _this.confirmSelection();
          }
          return e.preventDefault();
        };
      })(this));
    };


    /*
    Section: Methods that must be overridden
     */

    SelectListView.prototype.viewForItem = function(item) {
      throw new Error("Subclass must implement a viewForItem(item) method");
    };

    SelectListView.prototype.confirmed = function(item) {
      throw new Error("Subclass must implement a confirmed(item) method");
    };


    /*
    Section: Managing the list of items
     */

    SelectListView.prototype.setItems = function(items) {
      this.items = items != null ? items : [];
      this.populateList();
      return this.setLoading();
    };

    SelectListView.prototype.getSelectedItem = function() {
      return this.getSelectedItemView().data('select-list-item');
    };

    SelectListView.prototype.getFilterKey = function() {};

    SelectListView.prototype.getFilterQuery = function() {
      return this.filterEditorView.getEditor().getText();
    };

    SelectListView.prototype.setMaxItems = function(maxItems) {
      this.maxItems = maxItems;
    };

    SelectListView.prototype.populateList = function() {
      var filterQuery, filteredItems, i, item, itemView, _i, _ref1;
      if (this.items == null) {
        return;
      }
      filterQuery = this.getFilterQuery();
      if (filterQuery.length) {
        filteredItems = fuzzyFilter(this.items, filterQuery, {
          key: this.getFilterKey()
        });
      } else {
        filteredItems = this.items;
      }
      this.list.empty();
      if (filteredItems.length) {
        this.setError(null);
        for (i = _i = 0, _ref1 = Math.min(filteredItems.length, this.maxItems); 0 <= _ref1 ? _i < _ref1 : _i > _ref1; i = 0 <= _ref1 ? ++_i : --_i) {
          item = filteredItems[i];
          itemView = $(this.viewForItem(item));
          itemView.data('select-list-item', item);
          this.list.append(itemView);
        }
        return this.selectItemView(this.list.find('li:first'));
      } else {
        return this.setError(this.getEmptyMessage(this.items.length, filteredItems.length));
      }
    };


    /*
    Section: Messages to the user
     */

    SelectListView.prototype.setError = function(message) {
      if (message == null) {
        message = '';
      }
      if (message.length === 0) {
        return this.error.text('').hide();
      } else {
        this.setLoading();
        return this.error.text(message).show();
      }
    };

    SelectListView.prototype.setLoading = function(message) {
      if (message == null) {
        message = '';
      }
      if (message.length === 0) {
        this.loading.text("");
        this.loadingBadge.text("");
        return this.loadingArea.hide();
      } else {
        this.setError();
        this.loading.text(message);
        return this.loadingArea.show();
      }
    };

    SelectListView.prototype.getEmptyMessage = function(itemCount, filteredItemCount) {
      return 'No matches found';
    };


    /*
    Section: View Actions
     */

    SelectListView.prototype.cancel = function() {
      var filterEditorViewFocused;
      this.list.empty();
      this.cancelling = true;
      filterEditorViewFocused = this.filterEditorView.isFocused;
      this.cancelled();
      this.detach();
      if (filterEditorViewFocused) {
        this.restoreFocus();
      }
      this.cancelling = false;
      return clearTimeout(this.scheduleTimeout);
    };

    SelectListView.prototype.focusFilterEditor = function() {
      return this.filterEditorView.focus();
    };

    SelectListView.prototype.storeFocusedElement = function() {
      return this.previouslyFocusedElement = $(document.activeElement);
    };


    /*
    Section: Private
     */

    SelectListView.prototype.selectPreviousItemView = function() {
      var view;
      view = this.getSelectedItemView().prev();
      if (!view.length) {
        view = this.list.find('li:last');
      }
      return this.selectItemView(view);
    };

    SelectListView.prototype.selectNextItemView = function() {
      var view;
      view = this.getSelectedItemView().next();
      if (!view.length) {
        view = this.list.find('li:first');
      }
      return this.selectItemView(view);
    };

    SelectListView.prototype.selectItemView = function(view) {
      if (!view.length) {
        return;
      }
      this.list.find('.selected').removeClass('selected');
      view.addClass('selected');
      return this.scrollToItemView(view);
    };

    SelectListView.prototype.scrollToItemView = function(view) {
      var desiredBottom, desiredTop, scrollTop;
      scrollTop = this.list.scrollTop();
      desiredTop = view.position().top + scrollTop;
      desiredBottom = desiredTop + view.outerHeight();
      if (desiredTop < scrollTop) {
        return this.list.scrollTop(desiredTop);
      } else if (desiredBottom > this.list.scrollBottom()) {
        return this.list.scrollBottom(desiredBottom);
      }
    };

    SelectListView.prototype.restoreFocus = function() {
      var _ref1;
      if ((_ref1 = this.previouslyFocusedElement) != null ? _ref1.isOnDom() : void 0) {
        return this.previouslyFocusedElement.focus();
      } else {
        return atom.workspaceView.focus();
      }
    };

    SelectListView.prototype.cancelled = function() {
      return this.filterEditorView.getEditor().setText('');
    };

    SelectListView.prototype.getSelectedItemView = function() {
      return this.list.find('li.selected');
    };

    SelectListView.prototype.confirmSelection = function() {
      var item;
      item = this.getSelectedItem();
      if (item != null) {
        return this.confirmed(item);
      } else {
        return this.cancel();
      }
    };

    SelectListView.prototype.schedulePopulateList = function() {
      var populateCallback;
      clearTimeout(this.scheduleTimeout);
      populateCallback = (function(_this) {
        return function() {
          if (_this.isOnDom()) {
            return _this.populateList();
          }
        };
      })(this);
      return this.scheduleTimeout = setTimeout(populateCallback, this.inputThrottle);
    };

    return SelectListView;

  })(View);

}).call(this);
