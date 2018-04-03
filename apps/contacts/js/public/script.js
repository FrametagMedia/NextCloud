/**
 * Nextcloud - contacts
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Hendrik Leppelsack <hendrik@leppelsack.de>
 * @copyright Hendrik Leppelsack 2015
 */

angular.module('contactsApp', ['uuid4', 'angular-cache', 'ngRoute', 'ui.bootstrap', 'ui.select', 'ngSanitize', 'angular-click-outside', 'ngclipboard'])
.config(['$routeProvider', function($routeProvider) {

	$routeProvider.when('/:gid', {
		template: '<contactdetails></contactdetails>'
	});

	$routeProvider.when('/contact/:uid', {
		redirectTo: function(parameters) {
			return '/' + t('contacts', 'All contacts') + '/' + parameters.uid;
		}
	});

	$routeProvider.when('/:gid/:uid', {
		template: '<contactdetails></contactdetails>'
	});

	$routeProvider.otherwise('/' + t('contacts', 'All contacts'));

}]);

angular.module('contactsApp')
.directive('datepicker', ['$timeout', function($timeout) {
	var loadDatepicker = function (scope, element, attrs, ngModelCtrl) {
		$timeout(function() {
			element.datepicker({
				dateFormat:'yy-mm-dd',
				minDate: null,
				maxDate: null,
				constrainInput: false,
				onSelect:function (date, dp) {
					if (dp.selectedYear < 1000) {
						date = '0' + date;
					}
					if (dp.selectedYear < 100) {
						date = '0' + date;
					}
					if (dp.selectedYear < 10) {
						date = '0' + date;
					}
					ngModelCtrl.$setViewValue(date);
					scope.$apply();
				}
			});
		});
	};
	return {
		restrict: 'A',
		require : 'ngModel',
		transclude: true,
		link : loadDatepicker
	};
}]);

angular.module('contactsApp')
.directive('focusExpression', ['$timeout', function ($timeout) {
	return {
		restrict: 'A',
		link: {
			post: function postLink(scope, element, attrs) {
				scope.$watch(attrs.focusExpression, function () {
					if (attrs.focusExpression) {
						if (scope.$eval(attrs.focusExpression)) {
							$timeout(function () {
								if (element.is('input')) {
									element.focus();
								} else {
									element.find('input').focus();
								}
							}, 100); //need some delay to work with ng-disabled
						}
					}
				});
			}
		}
	};
}]);

angular.module('contactsApp')
.directive('inputresize', function() {
	return {
		restrict: 'A',
		link : function (scope, element) {
			var elInput = element.val();
			element.bind('keydown keyup load focus', function() {
				elInput = element.val();
				// If set to 0, the min-width css data is ignored
				var length = elInput.length > 1 ? elInput.length : 1;
				element.attr('size', length);
			});
		}
	};
});

angular.module('contactsApp')
.directive('selectExpression', ['$timeout', function ($timeout) {
	return {
		restrict: 'A',
		link: {
			post: function postLink(scope, element, attrs) {
				scope.$watch(attrs.selectExpression, function () {
					if (attrs.selectExpression) {
						if (scope.$eval(attrs.selectExpression)) {
							$timeout(function () {
								if (element.is('input')) {
									element.select();
								} else {
									element.find('input').select();
								}
							}, 100); //need some delay to work with ng-disabled
						}
					}
				});
			}
		}
	};
}]);

angular.module('contactsApp')
.controller('addressbookCtrl', ['$scope', 'AddressBookService', function($scope, AddressBookService) {
	var ctrl = this;

	ctrl.t = {
		download: t('contacts', 'Download'),
		copyURL: t('contacts', 'Copy link'),
		clickToCopy: t('contacts', 'Click to copy the link to your clipboard'),
		shareAddressbook: t('contacts', 'Toggle sharing'),
		deleteAddressbook: t('contacts', 'Delete'),
		renameAddressbook: t('contacts', 'Rename'),
		shareInputPlaceHolder: t('contacts', 'Share with users or groups'),
		delete: t('contacts', 'Delete'),
		canEdit: t('contacts', 'can edit'),
		close: t('contacts', 'Close'),
		enabled: t('contacts', 'Enabled'),
		disabled: t('contacts', 'Disabled')
	};

	ctrl.editing = false;
	ctrl.enabled = ctrl.addressBook.enabled;

	ctrl.tooltipIsOpen = false;
	ctrl.tooltipTitle = ctrl.t.clickToCopy;
	ctrl.showInputUrl = false;

	ctrl.clipboardSuccess = function() {
		ctrl.tooltipIsOpen = true;
		ctrl.tooltipTitle = t('core', 'Copied!');
		_.delay(function() {
			ctrl.tooltipIsOpen = false;
			ctrl.tooltipTitle = ctrl.t.clickToCopy;
		}, 3000);
	};

	ctrl.clipboardError = function() {
		ctrl.showInputUrl = true;
		if (/iPhone|iPad/i.test(navigator.userAgent)) {
			ctrl.InputUrlTooltip = t('core', 'Not supported!');
		} else if (/Mac/i.test(navigator.userAgent)) {
			ctrl.InputUrlTooltip = t('core', 'Press ⌘-C to copy.');
		} else {
			ctrl.InputUrlTooltip = t('core', 'Press Ctrl-C to copy.');
		}
		$('#addressBookUrl_'+ctrl.addressBook.ctag).select();
	};

	ctrl.renameAddressBook = function() {
		AddressBookService.rename(ctrl.addressBook, ctrl.addressBook.displayName);
		ctrl.editing = false;
	};

	ctrl.edit = function() {
		ctrl.editing = true;
	};

	ctrl.closeMenus = function() {
		$scope.$parent.ctrl.openedMenu = false;
	};

	ctrl.openMenu = function(index) {
		ctrl.closeMenus();
		$scope.$parent.ctrl.openedMenu = index;
	};

	ctrl.toggleMenu = function(index) {
		if ($scope.$parent.ctrl.openedMenu === index) {
			ctrl.closeMenus();
		} else {
			ctrl.openMenu(index);
		}
	};

	ctrl.toggleSharesEditor = function() {
		ctrl.editingShares = !ctrl.editingShares;
		ctrl.selectedSharee = null;
	};

	/* From Calendar-Rework - js/app/controllers/calendarlistcontroller.js */
	ctrl.findSharee = function (val) {
		return $.get(
			OC.linkToOCS('apps/files_sharing/api/v1') + 'sharees',
			{
				format: 'json',
				search: val.trim(),
				perPage: 200,
				itemType: 'principals'
			}
		).then(function(result) {
			var users   = result.ocs.data.exact.users.concat(result.ocs.data.users);
			var groups  = result.ocs.data.exact.groups.concat(result.ocs.data.groups);

			var userShares = ctrl.addressBook.sharedWith.users;
			var userSharesLength = userShares.length;

			var groupsShares = ctrl.addressBook.sharedWith.groups;
			var groupsSharesLength = groupsShares.length;
			var i, j;

			// Filter out current user
			for (i = 0 ; i < users.length; i++) {
				if (users[i].value.shareWith === OC.currentUser) {
					users.splice(i, 1);
					break;
				}
			}

			// Now filter out all sharees that are already shared with
			for (i = 0; i < userSharesLength; i++) {
				var shareUser = userShares[i];
				for (j = 0; j < users.length; j++) {
					if (users[j].value.shareWith === shareUser.id) {
						users.splice(j, 1);
						break;
					}
				}
			}

			// Now filter out all groups that are already shared with
			for (i = 0; i < groupsSharesLength; i++) {
				var sharedGroup = groupsShares[i];
				for (j = 0; j < groups.length; j++) {
					if (groups[j].value.shareWith === sharedGroup.id) {
						groups.splice(j, 1);
						break;
					}
				}
			}

			// Combine users and groups
			users = users.map(function(item) {
				return {
					display: _.escape(item.value.shareWith),
					type: OC.Share.SHARE_TYPE_USER,
					identifier: item.value.shareWith
				};
			});

			groups = groups.map(function(item) {
				return {
					display: _.escape(item.value.shareWith) + ' (group)',
					type: OC.Share.SHARE_TYPE_GROUP,
					identifier: item.value.shareWith
				};
			});

			return groups.concat(users);
		});
	};

	ctrl.onSelectSharee = function (item) {
		// Prevent settings to slide down
		$('#app-settings-header > button').data('apps-slide-toggle', false);
		_.delay(function() {
			$('#app-settings-header > button').data('apps-slide-toggle', '#app-settings-content');
		}, 500);

		ctrl.selectedSharee = null;
		AddressBookService.share(ctrl.addressBook, item.type, item.identifier, false, false).then(function() {
			$scope.$apply();
		});

	};

	ctrl.updateExistingUserShare = function(userId, writable) {
		AddressBookService.share(ctrl.addressBook, OC.Share.SHARE_TYPE_USER, userId, writable, true).then(function() {
			$scope.$apply();
		});
	};

	ctrl.updateExistingGroupShare = function(groupId, writable) {
		AddressBookService.share(ctrl.addressBook, OC.Share.SHARE_TYPE_GROUP, groupId, writable, true).then(function() {
			$scope.$apply();
		});
	};

	ctrl.unshareFromUser = function(userId) {
		AddressBookService.unshare(ctrl.addressBook, OC.Share.SHARE_TYPE_USER, userId).then(function() {
			$scope.$apply();
		});
	};

	ctrl.unshareFromGroup = function(groupId) {
		AddressBookService.unshare(ctrl.addressBook, OC.Share.SHARE_TYPE_GROUP, groupId).then(function() {
			$scope.$apply();
		});
	};

	ctrl.deleteAddressBook = function() {
		AddressBookService.delete(ctrl.addressBook).then(function() {
			$scope.$apply();
		});
	};

	ctrl.toggleState = function() {
		AddressBookService.toggleState(ctrl.addressBook).then(function(addressBook) {
			ctrl.enabled = addressBook.enabled;
			$scope.$apply();
		});
	};

}]);

angular.module('contactsApp')
.directive('addressbook', function() {
	return {
		restrict: 'A', // has to be an attribute to work with core css
		scope: {},
		controller: 'addressbookCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			addressBook: '=data',
			list: '='
		},
		templateUrl: OC.linkTo('contacts', 'templates/addressBook.html')
	};
});

angular.module('contactsApp')
.controller('addressbooklistCtrl', ['$scope', 'AddressBookService', function($scope, AddressBookService) {
	var ctrl = this;

	ctrl.loading = true;
	ctrl.openedMenu = false;
	ctrl.addressBookRegex = /^[a-zA-Z0-9À-ÿ\s-_.!?#|()]+$/i;

	AddressBookService.getAll().then(function(addressBooks) {
		ctrl.addressBooks = addressBooks;
		ctrl.loading = false;
		if(ctrl.addressBooks.length === 0) {
			AddressBookService.create(t('contacts', 'Contacts')).then(function() {
				AddressBookService.getAddressBook(t('contacts', 'Contacts')).then(function(addressBook) {
					ctrl.addressBooks.push(addressBook);
					$scope.$apply();
				});
			});
		}
	});

	ctrl.t = {
		addressBookName : t('contacts', 'Address book name'),
		regexError : t('contacts', 'Only these special characters are allowed: -_.!?#|()')
	};

	ctrl.createAddressBook = function() {
		if(ctrl.newAddressBookName) {
			AddressBookService.create(ctrl.newAddressBookName).then(function() {
				AddressBookService.getAddressBook(ctrl.newAddressBookName).then(function(addressBook) {
					ctrl.addressBooks.push(addressBook);
					$scope.$apply();
				});
			}).catch(function() {
				OC.Notification.showTemporary(t('contacts', 'Address book could not be created.'));
			});
		}
	};
}]);

angular.module('contactsApp')
.directive('addressbooklist', function() {
	return {
		restrict: 'EA', // has to be an attribute to work with core css
		scope: {},
		controller: 'addressbooklistCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/addressBookList.html')
	};
});

angular.module('contactsApp')
.controller('avatarCtrl', ['ContactService', function(ContactService) {
	var ctrl = this;

	ctrl.import = ContactService.import.bind(ContactService);

	ctrl.removePhoto = function() {
		ctrl.contact.removeProperty('photo', ctrl.contact.getProperty('photo'));
		ContactService.update(ctrl.contact);
		$('avatar').removeClass('maximized');
	};

	ctrl.downloadPhoto = function() {
		/* globals ArrayBuffer, Uint8Array */
		var img = document.getElementById('contact-avatar');
		// atob to base64_decode the data-URI
		var imageSplit = img.src.split(',');
		// "data:image/png;base64" -> "png"
		var extension = '.' + imageSplit[0].split(';')[0].split('/')[1];
		var imageData = atob(imageSplit[1]);
		// Use typed arrays to convert the binary data to a Blob
		var arrayBuffer = new ArrayBuffer(imageData.length);
		var view = new Uint8Array(arrayBuffer);
		for (var i=0; i<imageData.length; i++) {
			view[i] = imageData.charCodeAt(i) & 0xff;
		}
		var blob = new Blob([arrayBuffer], {type: 'application/octet-stream'});

		// Use the URL object to create a temporary URL
		var url = (window.webkitURL || window.URL).createObjectURL(blob);

		var a = document.createElement('a');
		document.body.appendChild(a);
		a.style = 'display: none';
		a.href = url;
		a.download = ctrl.contact.uid() + extension;
		a.click();
		window.URL.revokeObjectURL(url);
		a.remove();
	};

	ctrl.openPhoto = function() {
		$('avatar').toggleClass('maximized');
	};

	// Quit avatar preview
	$('avatar').click(function() {
		$('avatar').removeClass('maximized');
	});
	$('avatar img, avatar .avatar-options').click(function(e) {
		e.stopPropagation();
	});
	$(document).keyup(function(e) {
		if (e.keyCode === 27) {
			$('avatar').removeClass('maximized');
		}
	});

}]);

angular.module('contactsApp')
.directive('avatar', ['ContactService', function(ContactService) {
	return {
		scope: {
			contact: '=data'
		},
		controller: 'avatarCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			contact: '=data'
		},
		link: function(scope, element) {
			var input = element.find('input');
			input.bind('change', function() {
				var file = input.get(0).files[0];
				if (file.size > 1024*1024) { // 1 MB
					OC.Notification.showTemporary(t('contacts', 'The selected image is too big (max 1MB)'));
				} else {
					var reader = new FileReader();

					reader.addEventListener('load', function () {
						scope.$apply(function() {
							scope.contact.photo(reader.result);
							ContactService.update(scope.contact);
						});
					}, false);

					if (file) {
						reader.readAsDataURL(file);
					}
				}
			});
		},
		templateUrl: OC.linkTo('contacts', 'templates/avatar.html')
	};
}]);

angular.module('contactsApp')
.controller('contactdetailsCtrl', ['ContactService', 'AddressBookService', 'vCardPropertiesService', '$route', '$routeParams', '$scope', function(ContactService, AddressBookService, vCardPropertiesService, $route, $routeParams, $scope) {

	var ctrl = this;

	ctrl.init = true;
	ctrl.loading = false;
	ctrl.show = false;

	ctrl.clearContact = function() {
		$route.updateParams({
			gid: $routeParams.gid,
			uid: undefined
		});
		ctrl.show = false;
		ctrl.contact = undefined;
	};

	ctrl.uid = $routeParams.uid;
	ctrl.t = {
		noContacts : t('contacts', 'No contacts in here'),
		placeholderName : t('contacts', 'Name'),
		placeholderOrg : t('contacts', 'Organization'),
		placeholderTitle : t('contacts', 'Title'),
		selectField : t('contacts', 'Add field …'),
		download : t('contacts', 'Download'),
		delete : t('contacts', 'Delete'),
		save : t('contacts', 'Save changes'),
		addressBook : t('contacts', 'Address book'),
		loading : t('contacts', 'Loading contacts …')
	};

	ctrl.fieldDefinitions = vCardPropertiesService.fieldDefinitions;
	ctrl.focus = undefined;
	ctrl.field = undefined;
	ctrl.addressBooks = [];

	AddressBookService.getAll().then(function(addressBooks) {
		ctrl.addressBooks = addressBooks;

		if (!angular.isUndefined(ctrl.contact)) {
			ctrl.addressBook = _.find(ctrl.addressBooks, function(book) {
				return book.displayName === ctrl.contact.addressBookId;
			});
		}
		ctrl.init = false;
		// Start watching for ctrl.uid when we have addressBooks, as they are needed for fetching
		// full details.
		$scope.$watch('ctrl.uid', function(newValue) {
			ctrl.changeContact(newValue);
		});
	});


	ctrl.changeContact = function(uid) {
		if (typeof uid === 'undefined') {
			ctrl.show = false;
			$('#app-navigation-toggle').removeClass('showdetails');
			return;
		}
		ctrl.loading = true;
		ContactService.getById(ctrl.addressBooks, uid).then(function(contact) {
			if (angular.isUndefined(contact)) {
				ctrl.clearContact();
				return;
			}
			ctrl.contact = contact;
			ctrl.show = true;
			ctrl.loading = false;
			$('#app-navigation-toggle').addClass('showdetails');

			ctrl.addressBook = _.find(ctrl.addressBooks, function(book) {
				return book.displayName === ctrl.contact.addressBookId;
			});
		});
	};

	ctrl.deleteContact = function() {
		ContactService.delete(ctrl.addressBook, ctrl.contact);
	};

	ctrl.addField = function(field) {
		var defaultValue = vCardPropertiesService.getMeta(field).defaultValue || {value: ''};
		ctrl.contact.addProperty(field, defaultValue);
		ctrl.focus = field;
		ctrl.field = '';
	};

	ctrl.deleteField = function (field, prop) {
		ctrl.contact.removeProperty(field, prop);
		ctrl.focus = undefined;
	};

	ctrl.changeAddressBook = function (addressBook, oldAddressBook) {
		ContactService.moveContact(ctrl.contact, addressBook, oldAddressBook);
	};

	ctrl.updateContact = function() {
		ContactService.queueUpdate(ctrl.contact);
	};
}]);

angular.module('contactsApp')
.directive('contactdetails', function() {
	return {
		priority: 1,
		scope: {},
		controller: 'contactdetailsCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/contactDetails.html')
	};
});

angular.module('contactsApp')
.controller('contactCtrl', ['$route', '$routeParams', 'SortByService', function($route, $routeParams, SortByService) {
	var ctrl = this;

	ctrl.t = {
		errorMessage : t('contacts', 'This card is corrupted and has been fixed. Please check the data and trigger a save to make the changes permanent.'),
	};

	ctrl.getName = function() {
		// If lastName equals to firstName then none of them is set
		if (ctrl.contact.lastName() === ctrl.contact.firstName()) {
			return ctrl.contact.displayName();
		}

		if (SortByService.getSortByKey() === 'sortLastName') {
			return (
				ctrl.contact.lastName()
				+ (ctrl.contact.firstName() ? ', ' : '')
				+ ctrl.contact.firstName() + ' '
				+ ctrl.contact.additionalNames()
			).trim();
		}

		if (SortByService.getSortByKey() === 'sortFirstName') {
			return (
				ctrl.contact.firstName() + ' '
				+ ctrl.contact.additionalNames() + ' '
				+ ctrl.contact.lastName()
			).trim();
		}

		return ctrl.contact.displayName();
	};
}]);


angular.module('contactsApp')
.directive('contact', function() {
	return {
		scope: {},
		controller: 'contactCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			contact: '=data'
		},
		templateUrl: OC.linkTo('contacts', 'templates/contact.html')
	};
});

angular.module('contactsApp')
.controller('contactfilterCtrl', function() {
	// eslint-disable-next-line no-unused-vars
	var ctrl = this;
});

angular.module('contactsApp')
.directive('contactFilter', function() {
	return {
		restrict: 'A', // has to be an attribute to work with core css
		scope: {},
		controller: 'contactfilterCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			contactFilter: '=contactFilter'
		},
		templateUrl: OC.linkTo('contacts', 'templates/contactFilter.html')
	};
});

angular.module('contactsApp')
.controller('contactimportCtrl', ['ContactService', 'AddressBookService', '$timeout', '$scope', function(ContactService, AddressBookService, $timeout, $scope) {
	var ctrl = this;

	ctrl.t = {
		importText : t('contacts', 'Import into'),
		importingText : t('contacts', 'Importing...'),
		selectAddressbook : t('contacts', 'Select your addressbook'),
		importdisabled : t('contacts', 'Import is disabled because no writable address book had been found.')
	};

	ctrl.import = ContactService.import.bind(ContactService);
	ctrl.loading = true;
	ctrl.importText = ctrl.t.importText;
	ctrl.importing = false;
	ctrl.loadingClass = 'icon-upload';

	AddressBookService.getAll().then(function(addressBooks) {
		ctrl.addressBooks = addressBooks;
		ctrl.loading = false;
		ctrl.selectedAddressBook = AddressBookService.getDefaultAddressBook();
	});

	AddressBookService.registerObserverCallback(function() {
		$timeout(function() {
			$scope.$apply(function() {
				ctrl.selectedAddressBook = AddressBookService.getDefaultAddressBook();
			});
		});
	});

	ctrl.stopHideMenu = function(isOpen) {
		if(isOpen) {
			// disabling settings bind
			$('#app-settings-header > button').data('apps-slide-toggle', false);
		} else {
			// reenabling it
			$('#app-settings-header > button').data('apps-slide-toggle', '#app-settings-content');
		}
	};

}]);

angular.module('contactsApp')
.directive('contactimport', ['ContactService', 'ImportService', '$rootScope', function(ContactService, ImportService, $rootScope) {
	return {
		link: function(scope, element, attrs, ctrl) {
			var input = element.find('input');
			input.bind('change', function() {
				angular.forEach(input.get(0).files, function(file) {
					var reader = new FileReader();

					reader.addEventListener('load', function () {
						scope.$apply(function () {
							// Indicate the user we started something
							ctrl.importText = ctrl.t.importingText;
							ctrl.loadingClass = 'icon-loading-small';
							ctrl.importing = true;
							$rootScope.importing = true;

							ContactService.import.call(ContactService, reader.result, file.type, ctrl.selectedAddressBook, function (progress, user) {
								if (progress === 1) {
									ctrl.importText = ctrl.t.importText;
									ctrl.loadingClass = 'icon-upload';
									ctrl.importing = false;
									$rootScope.importing = false;
									ImportService.importPercent = 0;
									ImportService.importing = false;
									ImportService.importedUser = '';
									ImportService.selectedAddressBook = '';
								} else {
									// Ugly hack, hide sidebar on import & mobile
									// Simulate click since we can't directly access snapper
									if($(window).width() <= 768 && $('body').hasClass('snapjs-left')) {
										$('#app-navigation-toggle').click();
										$('body').removeClass('snapjs-left');
									}

									ImportService.importPercent = parseInt(Math.floor(progress * 100));
									ImportService.importing = true;
									ImportService.importedUser = user;
									ImportService.selectedAddressBook = ctrl.selectedAddressBook.displayName;
								}
								scope.$apply();

								/* Broadcast service update */
								$rootScope.$broadcast('importing', true);
							});
						});
					}, false);

					if (file) {
						reader.readAsText(file);
					}
				});
				input.get(0).value = '';
			});
		},
		templateUrl: OC.linkTo('contacts', 'templates/contactImport.html'),
		controller: 'contactimportCtrl',
		controllerAs: 'ctrl'
	};
}]);

angular.module('contactsApp')
.controller('contactlistCtrl', ['$scope', '$filter', '$route', '$routeParams', '$timeout', 'AddressBookService', 'ContactService', 'SortByService', 'vCardPropertiesService', 'SearchService', function($scope, $filter, $route, $routeParams, $timeout, AddressBookService, ContactService, SortByService, vCardPropertiesService, SearchService) {
	var ctrl = this;

	ctrl.routeParams = $routeParams;

	ctrl.filteredContacts = []; // the displayed contacts list
	ctrl.searchTerm = '';
	ctrl.show = true;
	ctrl.invalid = false;
	ctrl.limitTo = 25;

	ctrl.sortBy = SortByService.getSortBy();

	ctrl.t = {
		emptySearch : t('contacts', 'No search result for {query}', {query: ctrl.searchTerm})
	};

	ctrl.resetLimitTo = function () {
		ctrl.limitTo = 25;
		clearInterval(ctrl.intervalId);
		ctrl.intervalId = setInterval(
			function () {
				if (!ctrl.loading && ctrl.contactList && ctrl.contactList.length > ctrl.limitTo) {
					ctrl.limitTo += 25;
					$scope.$apply();
				}
			}, 300);
	};

	$scope.query = function(contact) {
		return contact.matches(SearchService.getSearchTerm());
	};

	SortByService.subscribe(function(newValue) {
		ctrl.sortBy = newValue;
	});

	SearchService.registerObserverCallback(function(ev) {
		if (ev.event === 'submitSearch') {
			var uid = !_.isEmpty(ctrl.filteredContacts) ? ctrl.filteredContacts[0].uid() : undefined;
			ctrl.setSelectedId(uid);
			$scope.$apply();
		}
		if (ev.event === 'changeSearch') {
			ctrl.resetLimitTo();
			ctrl.searchTerm = ev.searchTerm;
			ctrl.t.emptySearch = t('contacts',
								   'No search result for {query}',
								   {query: ctrl.searchTerm}
								  );
			$scope.$apply();
		}
	});

	ctrl.loading = true;

	ContactService.registerObserverCallback(function(ev) {
		/* after import at first refresh the contactList */
		if (ev.event === 'importend') {
			$scope.$apply(function() {
				ctrl.contactList = ev.contacts;
			});
		}
		/* update route parameters */
		$timeout(function() {
			$scope.$apply(function() {
				switch(ev.event) {
				case 'delete':
					ctrl.selectNearestContact(ev.uid);
					break;
				case 'create':
					$route.updateParams({
						gid: $routeParams.gid,
						uid: ev.uid
					});
					break;
				case 'importend':
					/* after import select 'All contacts' group and first contact */
					$route.updateParams({
						gid: t('contacts', 'All contacts'),
						uid: ctrl.filteredContacts.length !== 0 ? ctrl.filteredContacts[0].uid() : undefined
					});
					return;
				case 'getFullContacts' || 'update':
					break;
				default:
					// unknown event -> leave callback without action
					return;
				}
				ctrl.contactList = ev.contacts;
			});
		});
	});

	AddressBookService.registerObserverCallback(function(ev) {
		$timeout(function() {
			$scope.$apply(function() {
				switch (ev.event) {
				case 'delete':
				case 'disable':
					ctrl.loading = true;
					ContactService.removeContactsFromAddressbook(ev.addressBook, function() {
						ContactService.getAll().then(function(contacts) {
							ctrl.contactList = contacts;
							ctrl.loading = false;
							// Only change contact if the selectd one is not in the list anymore
							if(ctrl.contactList.findIndex(function(contact) {
								return contact.uid() === ctrl.getSelectedId();
							}) === -1) {
								ctrl.selectNearestContact(ctrl.getSelectedId());
							}
						});
					});
					break;
				case 'enable':
					ctrl.loading = true;
					ContactService.appendContactsFromAddressbook(ev.addressBook, function() {
						ContactService.getAll().then(function(contacts) {
							ctrl.contactList = contacts;
							ctrl.loading = false;
						});
					});
					break;
				default:
						// unknown event -> leave callback without action
					return;

				}
			});
		});
	});

	// Get contacts
	ContactService.getAll().then(function(contacts) {
		if(contacts.length>0) {
			$scope.$apply(function() {
				ctrl.contactList = contacts;
			});
		} else {
			ctrl.loading = false;
		}
	});

	var getVisibleContacts = function() {
		var scrolled = $('.app-content-list').scrollTop();
		var elHeight = $('.contacts-list').children().outerHeight(true);
		var listHeight = $('.app-content-list').height();

		var topContact = Math.round(scrolled/elHeight);
		var contactsCount = Math.round(listHeight/elHeight);

		return ctrl.filteredContacts.slice(topContact-1, topContact+contactsCount+1);
	};

	var timeoutId = null;
	document.querySelector('.app-content-list').addEventListener('scroll', function () {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(function () {
			var contacts = getVisibleContacts();
			ContactService.getFullContacts(contacts);
		}, 250);
	});

	// Wait for ctrl.filteredContacts to be updated, load the contact requested in the URL if any, and
	// load full details for the probably initially visible contacts.
	// Then kill the watch.
	var unbindListWatch = $scope.$watch('ctrl.filteredContacts', function() {
		if(ctrl.filteredContacts && ctrl.filteredContacts.length > 0) {
			// Check if a specific uid is requested
			if($routeParams.uid && $routeParams.gid) {
				ctrl.filteredContacts.forEach(function(contact) {
					if(contact.uid() === $routeParams.uid) {
						ctrl.setSelectedId($routeParams.uid);
						ctrl.loading = false;
					}
				});
			}
			// No contact previously loaded, let's load the first of the list if not in mobile mode
			if(ctrl.loading && $(window).width() > 768) {
				ctrl.setSelectedId(ctrl.filteredContacts[0].uid());
			}
			// Get full data for the first 20 contacts of the list
			ContactService.getFullContacts(ctrl.filteredContacts.slice(0, 20));
			ctrl.loading = false;
			unbindListWatch();
		}
	});

	$scope.$watch('ctrl.routeParams.uid', function(newValue, oldValue) {
		// Used for mobile view to clear the url
		if(typeof oldValue != 'undefined' && typeof newValue == 'undefined' && $(window).width() <= 768) {
			// no contact selected
			ctrl.show = true;
			return;
		}
		if(newValue === undefined) {
			// we might have to wait until ng-repeat filled the contactList
			if(ctrl.filteredContacts && ctrl.filteredContacts.length > 0) {
				$route.updateParams({
					gid: $routeParams.gid,
					uid: ctrl.filteredContacts[0].uid()
				});
			} else {
				// watch for next contactList update
				var unbindWatch = $scope.$watch('ctrl.filteredContacts', function() {
					if(ctrl.filteredContacts && ctrl.filteredContacts.length > 0) {
						$route.updateParams({
							gid: $routeParams.gid,
							uid: ctrl.filteredContacts[0].uid()
						});
					}
					unbindWatch(); // unbind as we only want one update
				});
			}
		} else {
			// displaying contact details
			ctrl.show = false;
		}
	});

	$scope.$watch('ctrl.routeParams.gid', function() {
		// we might have to wait until ng-repeat filled the contactList
		ctrl.filteredContacts = [];
		ctrl.resetLimitTo();
		// not in mobile mode
		if($(window).width() > 768) {
			// watch for next contactList update
			var unbindWatch = $scope.$watch('ctrl.filteredContacts', function() {
				if(ctrl.filteredContacts && ctrl.filteredContacts.length > 0) {
					$route.updateParams({
						gid: $routeParams.gid,
						uid: $routeParams.uid || ctrl.filteredContacts[0].uid()
					});
				}
				unbindWatch(); // unbind as we only want one update
			});
		}
	});

	// Watch if we have an invalid contact
	$scope.$watch('ctrl.filteredContacts[0].displayName()', function(displayName) {
		ctrl.invalid = (displayName === '');
	});

	ctrl.hasContacts = function () {
		if (!ctrl.contactList) {
			return false;
		}
		return ctrl.contactList.length > 0;
	};

	ctrl.setSelectedId = function (contactId) {
		$route.updateParams({
			uid: contactId
		});
	};

	ctrl.getSelectedId = function() {
		return $routeParams.uid;
	};

	ctrl.selectNearestContact = function(contactId) {
		if (ctrl.filteredContacts.length === 1) {
			$route.updateParams({
				gid: $routeParams.gid,
				uid: undefined
			});
		} else {
			for (var i = 0, length = ctrl.filteredContacts.length; i < length; i++) {
				// Get nearest contact
				if (ctrl.filteredContacts[i].uid() === contactId) {
					$route.updateParams({
						gid: $routeParams.gid,
						uid: (ctrl.filteredContacts[i+1]) ? ctrl.filteredContacts[i+1].uid() : ctrl.filteredContacts[i-1].uid()
					});
					break;
				}
			}
		}
	};

}]);

angular.module('contactsApp')
.directive('contactlist', function() {
	return {
		priority: 1,
		scope: {},
		controller: 'contactlistCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			addressbook: '=adrbook'
		},
		templateUrl: OC.linkTo('contacts', 'templates/contactList.html')
	};
});

angular.module('contactsApp')
.controller('detailsItemCtrl', ['$templateRequest', '$filter', 'vCardPropertiesService', 'ContactService', function($templateRequest, $filter, vCardPropertiesService, ContactService) {
	var ctrl = this;

	ctrl.meta = vCardPropertiesService.getMeta(ctrl.name);
	ctrl.type = undefined;
	ctrl.isPreferred = false;
	ctrl.t = {
		poBox : t('contacts', 'Post office box'),
		postalCode : t('contacts', 'Postal code'),
		city : t('contacts', 'City'),
		state : t('contacts', 'State or province'),
		country : t('contacts', 'Country'),
		address: t('contacts', 'Address'),
		newGroup: t('contacts', '(new group)'),
		familyName: t('contacts', 'Last name'),
		firstName: t('contacts', 'First name'),
		additionalNames: t('contacts', 'Additional names'),
		honorificPrefix: t('contacts', 'Prefix'),
		honorificSuffix: t('contacts', 'Suffix'),
		delete: t('contacts', 'Delete')
	};

	ctrl.availableOptions = ctrl.meta.options || [];
	if (!_.isUndefined(ctrl.data) && !_.isUndefined(ctrl.data.meta) && !_.isUndefined(ctrl.data.meta.type)) {
		// parse type of the property
		var array = ctrl.data.meta.type[0].split(',');
		array = array.map(function (elem) {
			return elem.trim().replace(/\/+$/, '').replace(/\\+$/, '').trim().toUpperCase();
		});
		// the pref value is handled on its own so that we can add some favorite icon to the ui if we want
		if (array.indexOf('PREF') >= 0) {
			ctrl.isPreferred = true;
			array.splice(array.indexOf('PREF'), 1);
		}
		// simply join the upper cased types together as key
		ctrl.type = array.join(',');
		var displayName = array.map(function (element) {
			return element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
		}).join(' ');
		// in case the type is not yet in the default list of available options we add it
		if (!ctrl.availableOptions.some(function(e) { return e.id === ctrl.type; } )) {
			ctrl.availableOptions = ctrl.availableOptions.concat([{id: ctrl.type, name: displayName}]);
		}

		// Remove duplicate entry
		ctrl.availableOptions = _.uniq(ctrl.availableOptions, function(option) { return option.name; });
		if (ctrl.availableOptions.filter(function(option) { return option.id === ctrl.type; }).length === 0) {
			// Our default value has been thrown out by the uniq function, let's find a replacement
			var optionName = ctrl.meta.options.filter(function(option) { return option.id === ctrl.type; })[0].name;
			ctrl.type = ctrl.availableOptions.filter(function(option) { return option.name === optionName; })[0].id;
			// We don't want to override the default keys. Compatibility > standardization
			// ctrl.data.meta.type[0] = ctrl.type;
			// ctrl.model.updateContact();
		}
	}
	if (!_.isUndefined(ctrl.data) && !_.isUndefined(ctrl.data.namespace)) {
		if (!_.isUndefined(ctrl.contact.props['X-ABLABEL'])) {
			var val = _.find(this.contact.props['X-ABLABEL'], function(x) { return x.namespace === ctrl.data.namespace; });
			ctrl.type = val.value.toUpperCase();
			if (!_.isUndefined(val)) {
				// in case the type is not yet in the default list of available options we add it
				if (!ctrl.availableOptions.some(function(e) { return e.id === val.value; } )) {
					ctrl.availableOptions = ctrl.availableOptions.concat([{id: val.value.toUpperCase(), name: val.value.toUpperCase()}]);
				}
			}
		}
	}

	ctrl.availableGroups = [];

	ContactService.getGroups().then(function(groups) {
		ctrl.availableGroups = _.unique(groups);
	});

	ctrl.changeType = function (val) {
		if (ctrl.isPreferred) {
			val += ',PREF';
		}
		ctrl.data.meta = ctrl.data.meta || {};
		ctrl.data.meta.type = ctrl.data.meta.type || [];
		ctrl.data.meta.type[0] = val;
		ContactService.queueUpdate(ctrl.contact);
	};

	ctrl.dateInputChanged = function () {
		ctrl.data.meta = ctrl.data.meta || {};

		var match = ctrl.data.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (match) {
			ctrl.data.meta.value = [];
		} else {
			ctrl.data.meta.value = ctrl.data.meta.value || [];
			ctrl.data.meta.value[0] = 'text';
		}
		ContactService.queueUpdate(ctrl.contact);
	};

	ctrl.updateDetailedName = function () {
		var fn = '';
		if (ctrl.data.value[3]) {
			fn += ctrl.data.value[3] + ' ';
		}
		if (ctrl.data.value[1]) {
			fn += ctrl.data.value[1] + ' ';
		}
		if (ctrl.data.value[2]) {
			fn += ctrl.data.value[2] + ' ';
		}
		if (ctrl.data.value[0]) {
			fn += ctrl.data.value[0] + ' ';
		}
		if (ctrl.data.value[4]) {
			fn += ctrl.data.value[4];
		}

		ctrl.contact.fullName(fn);
		ContactService.queueUpdate(ctrl.contact);
	};

	ctrl.updateContact = function() {
		ContactService.queueUpdate(ctrl.contact);
	};

	ctrl.getTemplate = function() {
		var templateUrl = OC.linkTo('contacts', 'templates/detailItems/' + ctrl.meta.template + '.html');
		return $templateRequest(templateUrl);
	};

	ctrl.deleteField = function () {
		ctrl.contact.removeProperty(ctrl.name, ctrl.data);
		ContactService.queueUpdate(ctrl.contact);
	};
}]);

angular.module('contactsApp')
.directive('detailsitem', ['$compile', function($compile) {
	return {
		scope: {},
		controller: 'detailsItemCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			name: '=',
			data: '=',
			contact: '=model',
			index: '='
		},
		link: function(scope, element, attrs, ctrl) {
			ctrl.getTemplate().then(function(html) {
				var template = angular.element(html);
				element.append(template);
				$compile(template)(scope);
			});
		}
	};
}]);

angular.module('contactsApp')
.controller('groupCtrl', function() {
	// eslint-disable-next-line no-unused-vars
	var ctrl = this;
});

angular.module('contactsApp')
.directive('group', function() {
	return {
		restrict: 'A', // has to be an attribute to work with core css
		scope: {},
		controller: 'groupCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			group: '=group'
		},
		templateUrl: OC.linkTo('contacts', 'templates/group.html')
	};
});

angular.module('contactsApp')
.controller('grouplistCtrl', ['$scope', '$timeout', 'ContactService', 'SearchService', '$routeParams', function($scope, $timeout, ContactService, SearchService, $routeParams) {
	var ctrl = this;

	ctrl.groups = [];
	ctrl.contactFilters = [];

	ContactService.getGroupList().then(function(groups) {
		ctrl.groups = groups;
	});

	ContactService.getContactFilters().then(function(contactFilters) {
		ctrl.contactFilters = contactFilters;
	});

	ctrl.getSelected = function() {
		return $routeParams.gid;
	};

	// Update groupList on contact add/delete/update/groupsUpdate
	ContactService.registerObserverCallback(function(ev) {
		if (ev.event !== 'getFullContacts') {
			$timeout(function () {
				$scope.$apply(function() {
					ContactService.getGroupList().then(function(groups) {
						ctrl.groups = groups;
					});
					ContactService.getContactFilters().then(function(contactFilters) {
						ctrl.contactFilters = contactFilters;
					});
				});
			});
		}
	});

	ctrl.setSelected = function (selectedGroup) {
		SearchService.cleanSearch();
		$routeParams.gid = selectedGroup;
	};
}]);

angular.module('contactsApp')
.directive('grouplist', function() {
	return {
		restrict: 'EA', // has to be an attribute to work with core css
		scope: {},
		controller: 'grouplistCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/groupList.html')
	};
});

angular.module('contactsApp')
.controller('importscreenCtrl', ['$scope', 'ImportService', function($scope, ImportService) {
	var ctrl = this;

	ctrl.t = {
		importingTo : t('contacts', 'Importing into'),
		selectAddressbook : t('contacts', 'Select your addressbook')
	};

	// Broadcast update
	$scope.$on('importing', function () {
		ctrl.selectedAddressBook = ImportService.selectedAddressBook;
		ctrl.importedUser = ImportService.importedUser;
		ctrl.importing = ImportService.importing;
		ctrl.importPercent = ImportService.importPercent;
	});

}]);

angular.module('contactsApp')
.directive('importscreen', function() {
	return {
		restrict: 'EA', // has to be an attribute to work with core css
		scope: {},
		controller: 'importscreenCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/importScreen.html')
	};
});

angular.module('contactsApp')
.controller('newContactButtonCtrl', ['$scope', 'ContactService', '$routeParams', 'vCardPropertiesService', function($scope, ContactService, $routeParams, vCardPropertiesService) {
	var ctrl = this;

	ctrl.t = {
		addContact : t('contacts', 'New contact')
	};

	ctrl.createContact = function() {
		ContactService.create().then(function(contact) {
			['tel', 'adr', 'email'].forEach(function(field) {
				var defaultValue = vCardPropertiesService.getMeta(field).defaultValue || {value: ''};
				contact.addProperty(field, defaultValue);
			} );
			if ([t('contacts', 'All contacts'), t('contacts', 'Not grouped')].indexOf($routeParams.gid) === -1) {
				contact.categories([ $routeParams.gid ]);
			} else {
				contact.categories([]);
			}
			$('#details-fullName').focus();
		});
	};
}]);

angular.module('contactsApp')
.directive('newcontactbutton', function() {
	return {
		restrict: 'EA', // has to be an attribute to work with core css
		scope: {},
		controller: 'newContactButtonCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/newContactButton.html')
	};
});

angular.module('contactsApp')
.directive('telModel', function() {
	return{
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attr, ngModel) {
			ngModel.$formatters.push(function(value) {
				return value;
			});
			ngModel.$parsers.push(function(value) {
				return value;
			});
		}
	};
});

angular.module('contactsApp')
.controller('propertyGroupCtrl', ['vCardPropertiesService', function(vCardPropertiesService) {
	var ctrl = this;

	ctrl.meta = vCardPropertiesService.getMeta(ctrl.name);

	this.isHidden = function() {
		return ctrl.meta.hasOwnProperty('hidden') && ctrl.meta.hidden === true;
	};

	this.getIconClass = function() {
		return ctrl.meta.icon || 'icon-contacts-dark';
	};

	this.getReadableName = function() {
		return ctrl.meta.readableName;
	};
}]);

angular.module('contactsApp')
.directive('propertygroup', function() {
	return {
		scope: {},
		controller: 'propertyGroupCtrl',
		controllerAs: 'ctrl',
		bindToController: {
			properties: '=data',
			name: '=',
			contact: '=model'
		},
		templateUrl: OC.linkTo('contacts', 'templates/propertyGroup.html'),
		link: function(scope, element, attrs, ctrl) {
			if(ctrl.isHidden()) {
				// TODO replace with class
				element.css('display', 'none');
			}
		}
	};
});

angular.module('contactsApp')
.controller('sortbyCtrl', ['SortByService', function(SortByService) {
	var ctrl = this;

	var sortText = t('contacts', 'Sort by');
	ctrl.sortText = sortText;

	var sortList = SortByService.getSortByList();
	ctrl.sortList = sortList;

	ctrl.defaultOrder = SortByService.getSortByKey();

	ctrl.updateSortBy = function() {
		SortByService.setSortBy(ctrl.defaultOrder);
	};
}]);

angular.module('contactsApp')
.directive('sortby', function() {
	return {
		priority: 1,
		scope: {},
		controller: 'sortbyCtrl',
		controllerAs: 'ctrl',
		bindToController: {},
		templateUrl: OC.linkTo('contacts', 'templates/sortBy.html')
	};
});

angular.module('contactsApp')
.factory('AddressBook', function()
{
	return function AddressBook(data) {
		angular.extend(this, {

			displayName: '',
			contacts: [],
			groups: data.data.props.groups,
			readOnly: data.data.props.readOnly === '1',
			// In case of not defined
			enabled: data.data.props.enabled !== '0',

			sharedWith: {
				users: [],
				groups: []
			}

		});
		angular.extend(this, data);
		angular.extend(this, {
			owner: data.data.props.owner.split('/').slice(-2, -1)[0]
		});

		var shares = this.data.props.invite;
		if (typeof shares !== 'undefined') {
			for (var j = 0; j < shares.length; j++) {
				var href = shares[j].href;
				if (href.length === 0) {
					continue;
				}
				var access = shares[j].access;
				if (access.length === 0) {
					continue;
				}

				var readWrite = (typeof access.readWrite !== 'undefined');

				if (href.startsWith('principal:principals/users/')) {
					this.sharedWith.users.push({
						id: href.substr(27),
						displayname: href.substr(27),
						writable: readWrite
					});
				} else if (href.startsWith('principal:principals/groups/')) {
					this.sharedWith.groups.push({
						id: href.substr(28),
						displayname: href.substr(28),
						writable: readWrite
					});
				}
			}
		}
	};
});

angular.module('contactsApp')
	.factory('ContactFilter', function()
	{
		return function ContactFilter(data) {
			angular.extend(this, {
				name: '',
				count: 0
			});

			angular.extend(this, data);
		};
	});

angular.module('contactsApp')
.factory('Contact', ['$filter', 'MimeService', 'uuid4', function($filter, MimeService, uuid4) {
	return function Contact(addressBook, vCard) {
		angular.extend(this, {

			data: {},
			props: {},
			failedProps: [],

			dateProperties: ['bday', 'anniversary', 'deathdate'],

			addressBookId: addressBook.displayName,
			readOnly: addressBook.readOnly,

			version: function() {
				var property = this.getProperty('version');
				if(property) {
					return property.value;
				}

				return undefined;
			},

			uid: function(value) {
				var model = this;
				if (angular.isDefined(value)) {
					// setter
					return model.setProperty('uid', { value: value });
				} else {
					// getter
					var uid = model.getProperty('uid').value;
					/* global md5 */
					return uuid4.validate(uid) ? uid : md5(uid);
				}
			},

			displayName: function() {
				var displayName = this.fullName() || this.org() || '';
				if(angular.isArray(displayName)) {
					return displayName.join(' ');
				}
				return displayName;
			},

			readableFilename: function() {
				if(this.displayName()) {
					return (this.displayName()) + '.vcf';
				} else {
					// fallback to default filename (see download attribute)
					return '';
				}

			},

			firstName: function() {
				var property = this.getProperty('n');
				if (property) {
					return property.value[1];
				} else {
					return this.displayName();
				}
			},

			lastName: function() {
				var property = this.getProperty('n');
				if (property) {
					return property.value[0];
				} else {
					return this.displayName();
				}
			},

			additionalNames: function() {
				var property = this.getProperty('n');
				if (property) {
					return property.value[2];
				} else {
					return '';
				}
			},

			fullName: function(value) {
				var model = this;
				if (angular.isDefined(value)) {
					// setter
					return this.setProperty('fn', { value: value });
				} else {
					// getter
					var property = model.getProperty('fn');
					if(property) {
						return property.value;
					}
					property = model.getProperty('n');
					if(property) {
						return property.value.filter(function(elem) {
							return elem;
						}).join(' ');
					}
					return undefined;
				}
			},

			title: function(value) {
				if (angular.isDefined(value)) {
					// setter
					return this.setProperty('title', { value: value });
				} else {
					// getter
					var property = this.getProperty('title');
					if(property) {
						return property.value;
					} else {
						return undefined;
					}
				}
			},

			org: function(value) {
				var property = this.getProperty('org');
				if (angular.isDefined(value)) {
					var val = value;
					// setter
					if(property && Array.isArray(property.value)) {
						val = property.value;
						val[0] = value;
					}
					return this.setProperty('org', { value: val });
				} else {
					// getter
					if(property) {
						if (Array.isArray(property.value)) {
							return property.value[0];
						}
						return property.value;
					} else {
						return undefined;
					}
				}
			},

			email: function() {
				// getter
				var property = this.getProperty('email');
				if(property) {
					return property.value;
				} else {
					return undefined;
				}
			},

			photo: function(value) {
				if (angular.isDefined(value)) {
					// setter
					// splits image data into "data:image/jpeg" and base 64 encoded image
					var imageData = value.split(';base64,');
					var imageType = imageData[0].slice('data:'.length);
					if (!imageType.startsWith('image/')) {
						return;
					}
					imageType = imageType.substring(6).toUpperCase();

					return this.setProperty('photo', { value: imageData[1], meta: {type: [imageType], encoding: ['b']} });
				} else {
					var property = this.getProperty('photo');
					if(property) {
						var type = property.meta.type;
						if (angular.isArray(type)) {
							type = type[0];
						}
						if (!type.startsWith('image/')) {
							type = 'image/' + type.toLowerCase();
						}
						return 'data:' + type + ';base64,' + property.value;
					} else {
						return undefined;
					}
				}
			},

			categories: function(value) {
				if (angular.isDefined(value)) {
					// setter
					if (angular.isString(value)) {
						/* check for empty string */
						this.setProperty('categories', { value: !value.length ? [] : [value] });
					} else if (angular.isArray(value)) {
						this.setProperty('categories', { value: value });
					}
				} else {
					// getter
					var property = this.getProperty('categories');
					if(!property) {
						return [];
					}
					if (angular.isArray(property.value)) {
						return property.value;
					}
					return [property.value];
				}
			},

			formatDateAsRFC6350: function(name, data) {
				if (angular.isUndefined(data) || angular.isUndefined(data.value)) {
					return data;
				}
				if (this.dateProperties.indexOf(name) !== -1) {
					var match = data.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
					if (match) {
						data.value = match[1] + match[2] + match[3];
					}
				}

				return data;
			},

			formatDateForDisplay: function(name, data) {
				if (angular.isUndefined(data) || angular.isUndefined(data.value)) {
					return data;
				}
				if (this.dateProperties.indexOf(name) !== -1) {
					var match = data.value.match(/^(\d{4})(\d{2})(\d{2})$/);
					if (match) {
						data.value = match[1] + '-' + match[2] + '-' + match[3];
					}
				}

				return data;
			},

			getProperty: function(name) {
				if (this.props[name]) {
					return this.formatDateForDisplay(name, this.validate(name, this.props[name][0]));
				} else {
					return undefined;
				}
			},
			addProperty: function(name, data) {
				data = angular.copy(data);
				data = this.formatDateAsRFC6350(name, data);
				if(!this.props[name]) {
					this.props[name] = [];
				}
				var idx = this.props[name].length;
				this.props[name][idx] = data;

				// keep vCard in sync
				this.data.addressData = $filter('JSON2vCard')(this.props);
				return idx;
			},
			setProperty: function(name, data) {
				if(!this.props[name]) {
					this.props[name] = [];
				}
				data = this.formatDateAsRFC6350(name, data);
				this.props[name][0] = data;

				// keep vCard in sync
				this.data.addressData = $filter('JSON2vCard')(this.props);
			},
			removeProperty: function (name, prop) {
				angular.copy(_.without(this.props[name], prop), this.props[name]);
				if(this.props[name].length === 0) {
					delete this.props[name];
				}
				this.data.addressData = $filter('JSON2vCard')(this.props);
			},
			setETag: function(etag) {
				this.data.etag = etag;
			},
			setUrl: function(addressBook, uid) {
				this.data.url = addressBook.url + uid + '.vcf';
			},
			setAddressBook: function(addressBook) {
				this.addressBookId = addressBook.displayName;
				this.data.url = addressBook.url + this.uid() + '.vcf';
			},

			getISODate: function(date) {
				function pad(number) {
					if (number < 10) {
						return '0' + number;
					}
					return '' + number;
				}

				return date.getUTCFullYear() + '' +
						pad(date.getUTCMonth() + 1) +
						pad(date.getUTCDate()) +
						'T' + pad(date.getUTCHours()) +
						pad(date.getUTCMinutes()) +
						pad(date.getUTCSeconds()) + 'Z';
			},

			syncVCard: function() {

				this.setProperty('rev', { value: this.getISODate(new Date()) });
				var self = this;

				_.each(this.dateProperties, function(name) {
					if (!angular.isUndefined(self.props[name]) && !angular.isUndefined(self.props[name][0])) {
						// Set dates again to make sure they are in RFC-6350 format
						self.setProperty(name, self.props[name][0]);
					}
				});
				// force fn to be set
				this.fullName(this.fullName());

				// keep vCard in sync
				self.data.addressData = $filter('JSON2vCard')(self.props);

				// Revalidate all props
				_.each(self.failedProps, function(name, index) {
					if (!angular.isUndefined(self.props[name]) && !angular.isUndefined(self.props[name][0])) {
						// Reset previously failed properties
						self.failedProps.splice(index, 1);
						// And revalidate them again
						self.validate(name, self.props[name][0]);

					} else if(angular.isUndefined(self.props[name]) || angular.isUndefined(self.props[name][0])) {
						// Property has been removed
						self.failedProps.splice(index, 1);
					}
				});

			},

			matches: function(pattern) {
				if (angular.isUndefined(pattern) || pattern.length === 0) {
					return true;
				}
				var model = this;
				var matchingProps = ['fn', 'title', 'org', 'email', 'nickname', 'note', 'url', 'cloud', 'adr', 'impp', 'tel', 'gender', 'relationship'].filter(function (propName) {
					if (model.props[propName]) {
						return model.props[propName].filter(function (property) {
							if (!property.value) {
								return false;
							}
							if (angular.isString(property.value)) {
								return property.value.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
							}
							if (angular.isArray(property.value)) {
								return property.value.filter(function(v) {
									return v.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
								}).length > 0;
							}
							return false;
						}).length > 0;
					}
					return false;
				});
				return matchingProps.length > 0;
			},

			/* eslint-disable no-console */
			validate: function(prop, property) {
				switch(prop) {
				case 'rev':
				case 'prodid':
				case 'version':
					if (!angular.isUndefined(this.props[prop]) && this.props[prop].length > 1) {
						this.props[prop] = [this.props[prop][0]];
						console.warn(this.uid()+': Too many '+prop+' fields. Saving this one only: ' + this.props[prop][0].value);
						this.failedProps.push(prop);
					}
					break;

				case 'categories':
					// Avoid unescaped commas
					if (angular.isArray(property.value)) {
						if(property.value.join(';').indexOf(',') !== -1) {
							this.failedProps.push(prop);
							property.value = property.value.join(',').split(',');
							//console.warn(this.uid()+': Categories split: ' + property.value);
						}
					} else if (angular.isString(property.value)) {
						if(property.value.indexOf(',') !== -1) {
							this.failedProps.push(prop);
							property.value = property.value.split(',');
							//console.warn(this.uid()+': Categories split: ' + property.value);
						}
					}
					// Remove duplicate categories on array
					if(property.value.length !== 0 && angular.isArray(property.value)) {
						var uniqueCategories = _.unique(property.value);
						if(!angular.equals(uniqueCategories, property.value)) {
							this.failedProps.push(prop);
							property.value = uniqueCategories;
							//console.warn(this.uid()+': Categories duplicate: ' + property.value);
						}
					}
					break;
				case 'photo':
					// Avoid undefined photo type
					if (angular.isDefined(property)) {
						if (angular.isUndefined(property.meta.type)) {
							var mime = MimeService.b64mime(property.value);
							if (mime) {
								this.failedProps.push(prop);
								property.meta.type=[mime];
								this.setProperty('photo', {
									value:property.value,
									meta: {
										type:property.meta.type,
										encoding:property.meta.encoding
									}
								});
								console.warn(this.uid()+': Photo detected as ' + property.meta.type);
							} else {
								this.failedProps.push(prop);
								this.removeProperty('photo', property);
								property = undefined;
								console.warn(this.uid()+': Photo removed');
							}
						}
					}
					break;
				}
				return property;
			},
			/* eslint-enable no-console */

			fix: function() {
				this.validate('rev');
				this.validate('version');
				this.validate('prodid');
				return this.failedProps.indexOf('rev') !== -1
					|| this.failedProps.indexOf('prodid') !== -1
					|| this.failedProps.indexOf('version') !== -1;
			}

		});

		if(angular.isDefined(vCard)) {
			angular.extend(this.data, vCard);
			angular.extend(this.props, $filter('vCard2JSON')(this.data.addressData));
			// We do not want to store our addressbook within contacts
			delete this.data.addressBook;
		} else {
			angular.extend(this.props, {
				version: [{value: '3.0'}],
				fn: [{value: t('contacts', 'New contact')}]
			});
			this.data.addressData = $filter('JSON2vCard')(this.props);
		}

		var property = this.getProperty('categories');
		if(!property) {
			// categories should always have the same type (an array)
			this.categories([]);
		} else {
			if (angular.isString(property.value)) {
				this.categories([property.value]);
			}
		}
	};
}]);

angular.module('contactsApp')
	.factory('Group', function()
	{
		return function Group(data) {
			angular.extend(this, {
				name: '',
				count: 0
			});

			angular.extend(this, data);
		};
	});

angular.module('contactsApp')
.factory('AddressBookService', ['DavClient', 'DavService', 'SettingsService', 'AddressBook', '$q', function(DavClient, DavService, SettingsService, AddressBook, $q) {

	var addressBooks = [];
	var loadPromise = undefined;

	var observerCallbacks = [];

	var notifyObservers = function(eventName, addressBook) {
		var ev = {
			event: eventName,
			addressBooks: addressBooks,
			addressBook: addressBook,
		};
		angular.forEach(observerCallbacks, function(callback) {
			callback(ev);
		});
	};

	var loadAll = function() {
		if (addressBooks.length > 0) {
			return $q.when(addressBooks);
		}
		if (_.isUndefined(loadPromise)) {
			loadPromise = DavService.then(function(account) {
				loadPromise = undefined;
				addressBooks = account.addressBooks.map(function(addressBook) {
					return new AddressBook(addressBook);
				});
			});
		}
		return loadPromise;
	};

	return {
		registerObserverCallback: function(callback) {
			observerCallbacks.push(callback);
		},

		getAll: function() {
			return loadAll().then(function() {
				return addressBooks;
			});
		},

		getGroups: function() {
			return this.getAll().then(function(addressBooks) {
				return addressBooks.map(function (element) {
					return element.groups;
				}).reduce(function(a, b) {
					return a.concat(b);
				});
			});
		},

		getDefaultAddressBook: function(throwOC) {
			var i = addressBooks.findIndex(function(addressBook) {
				return addressBook.enabled && !addressBook.readOnly;
			});
			if (i !== -1) {
				return addressBooks[i];
			} else if(throwOC) {
				OC.Notification.showTemporary(t('contacts', 'There is no address book available to create a contact.'));
			}
			return false;
		},

		getAddressBook: function(displayName) {
			return DavService.then(function(account) {
				return DavClient.getAddressBook({displayName:displayName, url:account.homeUrl}).then(function(res) {
					var addressBook = new AddressBook({
						account: account,
						ctag: res[0].props.getctag,
						url: account.homeUrl+displayName+'/',
						data: res[0],
						displayName: res[0].props.displayname,
						resourcetype: res[0].props.resourcetype,
						syncToken: res[0].props.syncToken
					});
					notifyObservers('create', addressBook);
					return addressBook;
				});
			});
		},

		create: function(displayName) {
			return DavService.then(function(account) {
				return DavClient.createAddressBook({displayName:displayName, url:account.homeUrl});
			});
		},

		delete: function(addressBook) {
			return DavService.then(function() {
				return DavClient.deleteAddressBook(addressBook).then(function() {
					var index = addressBooks.indexOf(addressBook);
					addressBooks.splice(index, 1);
					notifyObservers('delete', addressBook);
				});
			});
		},

		rename: function(addressBook, displayName) {
			return DavService.then(function(account) {
				return DavClient.renameAddressBook(addressBook, {displayName:displayName, url:account.homeUrl});
			});
		},

		get: function(displayName) {
			return this.getAll().then(function(addressBooks) {
				return addressBooks.filter(function (element) {
					return element.displayName === displayName;
				})[0];
			});
		},

		sync: function(addressBook) {
			return DavClient.syncAddressBook(addressBook);
		},

		addContact: function(addressBook, contact) {
			// We don't want to add the same contact again
			if (addressBook.contacts.indexOf(contact) === -1) {
				return addressBook.contacts.push(contact);
			}
		},

		removeContact: function(addressBook, contact) {
			// We can't remove an undefined object
			if (addressBook.contacts.indexOf(contact) !== -1) {
				return addressBook.contacts.splice(addressBook.contacts.indexOf(contact), 1);
			}
		},

		toggleState: function(addressBook) {
			var xmlDoc = document.implementation.createDocument('', '', null);
			var dPropUpdate = xmlDoc.createElement('d:propertyupdate');
			dPropUpdate.setAttribute('xmlns:d', 'DAV:');
			dPropUpdate.setAttribute('xmlns:o', 'http://owncloud.org/ns');
			xmlDoc.appendChild(dPropUpdate);

			var dSet = xmlDoc.createElement('d:set');
			dPropUpdate.appendChild(dSet);

			var dProp = xmlDoc.createElement('d:prop');
			dSet.appendChild(dProp);

			var oEnabled = xmlDoc.createElement('o:enabled');
			// Revert state to toggle
			oEnabled.textContent = !addressBook.enabled ? '1' : '0';
			dProp.appendChild(oEnabled);

			var body = dPropUpdate.outerHTML;

			return DavClient.xhr.send(
				dav.request.basic({method: 'PROPPATCH', data: body}),
				addressBook.url
			).then(function(response) {
				if (response.status === 207) {
					addressBook.enabled = !addressBook.enabled;
					notifyObservers(
						addressBook.enabled ? 'enable' : 'disable',
						addressBook
					);
				}
				return addressBook;
			});
		},

		share: function(addressBook, shareType, shareWith, writable, existingShare) {
			var xmlDoc = document.implementation.createDocument('', '', null);
			var oShare = xmlDoc.createElement('o:share');
			oShare.setAttribute('xmlns:d', 'DAV:');
			oShare.setAttribute('xmlns:o', 'http://owncloud.org/ns');
			xmlDoc.appendChild(oShare);

			var oSet = xmlDoc.createElement('o:set');
			oShare.appendChild(oSet);

			var dHref = xmlDoc.createElement('d:href');
			if (shareType === OC.Share.SHARE_TYPE_USER) {
				dHref.textContent = 'principal:principals/users/';
			} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
				dHref.textContent = 'principal:principals/groups/';
			}
			dHref.textContent += shareWith;
			oSet.appendChild(dHref);

			var oSummary = xmlDoc.createElement('o:summary');
			oSummary.textContent = t('contacts', '{addressbook} shared by {owner}', {
				addressbook: addressBook.displayName,
				owner: addressBook.owner
			});
			oSet.appendChild(oSummary);

			if (writable) {
				var oRW = xmlDoc.createElement('o:read-write');
				oSet.appendChild(oRW);
			}

			var body = oShare.outerHTML;

			return DavClient.xhr.send(
				dav.request.basic({method: 'POST', data: body}),
				addressBook.url
			).then(function(response) {
				if (response.status === 200) {
					if (!existingShare) {
						if (shareType === OC.Share.SHARE_TYPE_USER) {
							addressBook.sharedWith.users.push({
								id: shareWith,
								displayname: shareWith,
								writable: writable
							});
						} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
							addressBook.sharedWith.groups.push({
								id: shareWith,
								displayname: shareWith,
								writable: writable
							});
						}
					}
				}
			});

		},

		unshare: function(addressBook, shareType, shareWith) {
			var xmlDoc = document.implementation.createDocument('', '', null);
			var oShare = xmlDoc.createElement('o:share');
			oShare.setAttribute('xmlns:d', 'DAV:');
			oShare.setAttribute('xmlns:o', 'http://owncloud.org/ns');
			xmlDoc.appendChild(oShare);

			var oRemove = xmlDoc.createElement('o:remove');
			oShare.appendChild(oRemove);

			var dHref = xmlDoc.createElement('d:href');
			if (shareType === OC.Share.SHARE_TYPE_USER) {
				dHref.textContent = 'principal:principals/users/';
			} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
				dHref.textContent = 'principal:principals/groups/';
			}
			dHref.textContent += shareWith;
			oRemove.appendChild(dHref);
			var body = oShare.outerHTML;


			return DavClient.xhr.send(
				dav.request.basic({method: 'POST', data: body}),
				addressBook.url
			).then(function(response) {
				if (response.status === 200) {
					if (shareType === OC.Share.SHARE_TYPE_USER) {
						addressBook.sharedWith.users = addressBook.sharedWith.users.filter(function(user) {
							return user.id !== shareWith;
						});
					} else if (shareType === OC.Share.SHARE_TYPE_GROUP) {
						addressBook.sharedWith.groups = addressBook.sharedWith.groups.filter(function(groups) {
							return groups.id !== shareWith;
						});
					}
					//todo - remove entry from addressbook object
					return true;
				} else {
					return false;
				}
			});

		}


	};

}]);

angular.module('contactsApp')
.service('ContactService', ['DavClient', 'AddressBookService', 'Contact', 'Group', 'ContactFilter', '$q', 'CacheFactory', 'uuid4', function(DavClient, AddressBookService, Contact, Group, ContactFilter, $q, CacheFactory, uuid4) {

	var contactService = this;

	var cacheFilled = false;
	var contactsCache = CacheFactory('contacts');
	var observerCallbacks = [];
	var loadPromise = undefined;

	var allUpdates = $q.when();
	this.queueUpdate = function(contact) {
		allUpdates = allUpdates.then(function() {
			return contactService.update(contact);
		});
	};

	this.registerObserverCallback = function(callback) {
		observerCallbacks.push(callback);
	};

	var notifyObservers = function(eventName, uid) {
		var ev = {
			event: eventName,
			uid: uid,
			contacts: contactsCache.values()
		};
		angular.forEach(observerCallbacks, function(callback) {
			callback(ev);
		});
	};

	this.getFullContacts = function(contacts) {
		AddressBookService.getAll().then(function(addressBooks) {
			var promises = [];
			var xhrAddressBooks = [];
			contacts.forEach(function(contact) {
				// Regroup urls by addressbooks
				if(addressBooks.indexOf(contact.addressBook) !== -1) {
					// Initiate array if no exists
					xhrAddressBooks[contact.addressBookId] = xhrAddressBooks[contact.addressBookId] || [];
					xhrAddressBooks[contact.addressBookId].push(contact.data.url);
				}
			});
			// Get our full vCards
			addressBooks.forEach(function(addressBook) {
				// Only go through enabled addressbooks
				// Though xhrAddressBooks does not contains contacts from disabled ones
				if(addressBook.enabled) {
					if(angular.isArray(xhrAddressBooks[addressBook.displayName])) {
						var promise = DavClient.getContacts(addressBook, {}, xhrAddressBooks[addressBook.displayName]).then(
							function(vcards) {
								return vcards.map(function(vcard) {
									return new Contact(addressBook, vcard);
								});
							}).then(function(contacts_) {
								contacts_.map(function(contact) {
									// Validate some fields
									if(contact.fix()) {
										// Can't use `this` in those nested functions
										contactService.update(contact);
									}
									contactsCache.put(contact.uid(), contact);
									addressBook.contacts.push(contact);
								});
							});
						promises.push(promise);
					}
				}
			});
			$q.all(promises).then(function() {
				notifyObservers('getFullContacts', '');
			});
		});
	};

	this.fillCache = function() {
		if (_.isUndefined(loadPromise)) {
			loadPromise = AddressBookService.getAll().then(function(addressBooks) {
				var promises = [];
				addressBooks.forEach(function(addressBook) {
					// Only go through enabled addressbooks
					if(addressBook.enabled) {
						promises.push(
							AddressBookService.sync(addressBook).then(function(addressBook) {
								contactService.appendContactsFromAddressbook(addressBook);
							})
						);
					}
				});
				return $q.all(promises).then(function() {
					cacheFilled = true;
				});
			});
		}
		return loadPromise;
	};

	this.getAll = function() {
		if(cacheFilled === false) {
			return this.fillCache().then(function() {
				return contactsCache.values();
			});
		} else {
			return $q.when(contactsCache.values());
		}
	};

	this.getContactFilters = function() {
		return this.getAll().then(function(contacts) {
			var allContacts = new ContactFilter({
				name: t('contacts', 'All contacts'),
				count: contacts.length
			});
			var notGrouped = new ContactFilter({
				name: t('contacts', 'Not grouped'),
				count: contacts.filter(
					function(contact) {
						return contact.categories().length === 0;
					}).length
			});
			var filters = [allContacts];
			// Only have Not Grouped if at least one contact in it
			if(notGrouped.count !== 0) {
				filters.push(notGrouped);
			}

			return filters;
		});
	};

	// get list of groups and the count of contacts in said groups
	this.getGroupList = function() {
		return this.getAll().then(function(contacts) {
			// allow groups with names such as toString
			var groups = Object.create(null);

			// collect categories and their associated counts
			contacts.forEach(function(contact) {
				contact.categories().forEach(function(category) {
					groups[category] = groups[category] ? groups[category] + 1 : 1;
				});
			});
			return _.keys(groups).map(
				function(key) {
					return new Group({
						name: key,
						count: groups[key]
					});
				});
		});
	};

	this.getGroups = function() {
		return this.getAll().then(function(contacts) {
			return _.uniq(contacts.map(function(element) {
				return element.categories();
			}).reduce(function(a, b) {
				return a.concat(b);
			}, []).sort(), true);
		});
	};

	this.getById = function(addressBooks, uid) {
		return (function() {
			if(cacheFilled === false) {
				return this.fillCache().then(function() {
					return contactsCache.get(uid);
				});
			} else {
				return $q.when(contactsCache.get(uid));
			}
		}).call(this)
			.then(function(contact) {
				if(angular.isUndefined(contact)) {
					OC.Notification.showTemporary(t('contacts', 'Contact not found.'));
					return;
				} else {
					var addressBook = addressBooks.find(function(book) {
						return book.displayName === contact.addressBookId;
					});
					// Fetch and return full contact vcard
					return addressBook
						? DavClient.getContacts(addressBook, {}, [ contact.data.url ]).then(function(vcards) {
							return new Contact(addressBook, vcards[0]);
						}).then(function(newContact) {
							contactsCache.put(contact.uid(), newContact);
							var contactIndex = addressBook.contacts.findIndex(function(testedContact) {
								return testedContact.uid() === contact.uid();
							});
							addressBook.contacts[contactIndex] = newContact;
							notifyObservers('getFullContacts', contact.uid());
							return newContact;
						}) : contact;
				}
			});
	};

	this.create = function(newContact, addressBook, uid, fromImport) {
		addressBook = addressBook || AddressBookService.getDefaultAddressBook(true);

		// No addressBook available
		if(!addressBook) {
			return;
		}

		if(addressBook.readOnly) {
			OC.Notification.showTemporary(t('contacts', 'You don\'t have permission to write to this addressbook.'));
			return;
		}
		try {
			newContact = newContact || new Contact(addressBook);
		} catch(error) {
			OC.Notification.showTemporary(t('contacts', 'Contact could not be created.'));
			return;
		}
		var newUid = '';
		if(uuid4.validate(uid)) {
			newUid = uid;
		} else {
			newUid = uuid4.generate();
		}
		newContact.uid(newUid);
		newContact.setUrl(addressBook, newUid);
		newContact.addressBookId = addressBook.displayName;
		if (_.isUndefined(newContact.fullName()) || newContact.fullName() === '') {
			newContact.fullName(newContact.displayName());
		}

		return DavClient.createCard(
			addressBook,
			{
				data: newContact.data.addressData,
				filename: newUid + '.vcf'
			}
		).then(function(xhr) {
			newContact.setETag(xhr.getResponseHeader('ETag'));
			contactsCache.put(newUid, newContact);
			AddressBookService.addContact(addressBook, newContact);
			if (fromImport !== true) {
				notifyObservers('create', newUid);
				$('#details-fullName').select();
			}
			return newContact;
		}).catch(function() {
			OC.Notification.showTemporary(t('contacts', 'Contact could not be created.'));
			return false;
		});
	};

	this.import = function(data, type, addressBook, progressCallback) {
		addressBook = addressBook || AddressBookService.getDefaultAddressBook(true);

		// No addressBook available
		if(!addressBook) {
			return;
		}

		var regexp = /BEGIN:VCARD[\s\S]*?END:VCARD/mgi;
		var singleVCards = data.match(regexp);

		if (!singleVCards) {
			OC.Notification.showTemporary(t('contacts', 'No contacts in file. Only vCard files are allowed.'));
			if (progressCallback) {
				progressCallback(1);
			}
			return;
		}

		notifyObservers('importstart');

		var num = 1;
		for(var i in singleVCards) {
			var newContact = new Contact(addressBook, {addressData: singleVCards[i]});
			if (['3.0', '4.0'].indexOf(newContact.version()) < 0) {
				if (progressCallback) {
					progressCallback(num / singleVCards.length);
				}
				OC.Notification.showTemporary(t('contacts', 'Only vCard version 4.0 (RFC6350) or version 3.0 (RFC2426) are supported.'));
				num++;
				continue;
			}
			// eslint-disable-next-line no-loop-func
			this.create(newContact, addressBook, '', true).then(function(xhrContact) {
				if (xhrContact !== false) {
					var xhrContactName = xhrContact.displayName();
				}
				// Update the progress indicator
				if (progressCallback) {
					progressCallback(num / singleVCards.length, xhrContactName);
				}
				num++;
				/* Import is over, let's notify */
				if (num === singleVCards.length + 1) {
					notifyObservers('importend');
				}
			});
		}
	};

	this.moveContact = function(contact, addressBook, oldAddressBook) {
		if (addressBook !== null && contact.addressBookId === addressBook.displayName) {
			return;
		}
		if (addressBook.readOnly) {
			OC.Notification.showTemporary(t('contacts', 'You don\'t have permission to write to this addressbook.'));
			return;
		}
		contact.syncVCard();

		DavClient.xhr.send(
			dav.request.basic({method: 'MOVE', destination: addressBook.url + contact.data.url.split('/').pop(-1)}),
			contact.data.url
		).then(function(response) {
			if (response.status === 201 || response.status === 204) {
				contact.setAddressBook(addressBook);
				AddressBookService.addContact(addressBook, contact);
				AddressBookService.removeContact(oldAddressBook, contact);
				notifyObservers('groupsUpdate');
			} else {
				OC.Notification.showTemporary(t('contacts', 'Contact could not be moved.'));
			}
		});
	};

	this.update = function(contact) {
		// update rev field
		contact.syncVCard();

		// update contact on server
		return DavClient.updateCard(contact.data, {json: true}).then(function(xhr) {
			var newEtag = xhr.getResponseHeader('ETag');
			contact.setETag(newEtag);
			notifyObservers('update', contact.uid());
		}).catch(function() {
			OC.Notification.showTemporary(t('contacts', 'Contact could not be saved.'));
		});
	};

	this.delete = function(addressBook, contact) {
		// delete contact from server
		return DavClient.deleteCard(contact.data).then(function() {
			contactsCache.remove(contact.uid());
			AddressBookService.removeContact(addressBook, contact);
			notifyObservers('delete', contact.uid());
		});
	};

	/*
	 * Delete all contacts present in the addressBook from the cache
	 */
	this.removeContactsFromAddressbook = function(addressBook, callback) {
		angular.forEach(addressBook.contacts, function(contact) {
			contactsCache.remove(contact.uid());
		});
		callback();
		notifyObservers('groupsUpdate');
	};

	/*
	 * Create and append contacts to the addressBook
	 */
	this.appendContactsFromAddressbook = function(addressBook, callback) {
		// Addressbook has been initiated but contacts have not been fetched
		if (addressBook.objects === null) {
			AddressBookService.sync(addressBook).then(function(addressBook) {
				contactService.appendContactsFromAddressbook(addressBook, callback);
			});
		} else if (addressBook.contacts.length === 0) {
			// Only add contact if the addressBook doesn't already have it
			addressBook.objects.forEach(function(vcard) {
				try {
					// Only add contact if the addressBook doesn't already have it
					var contact = new Contact(addressBook, vcard);
					contactsCache.put(contact.uid(), contact);
					AddressBookService.addContact(addressBook, contact);
				} catch(error) {
					// eslint-disable-next-line no-console
					console.log('Invalid contact received: ', vcard, error);
				}
			});
		} else {
			// Contact are already present in the addressBook
			angular.forEach(addressBook.contacts, function(contact) {
				contactsCache.put(contact.uid(), contact);
			});
		}
		notifyObservers('groupsUpdate');
		if (typeof callback === 'function') {
			callback();
		}
	};

}]);

angular.module('contactsApp')
.service('DavClient', function() {
	var xhr = new dav.transport.Basic(
		new dav.Credentials()
	);
	return new dav.Client(xhr);
});

angular.module('contactsApp')
.service('DavService', ['DavClient', function(DavClient) {
	return DavClient.createAccount({
		server: OC.linkToRemote('dav/addressbooks'),
		accountType: 'carddav',
		useProvidedPath: true
	});
}]);

angular.module('contactsApp')
.service('ImportService', function() {

	this.importing = false;
	this.selectedAddressBook = t('contacts', 'Import into');
	this.importedUser = t('contacts', 'Waiting for the server to be ready…');
	this.importPercent = 0;

	this.t = {
		importText : t('contacts', 'Import into'),
		importingText : t('contacts', 'Importing…')
	};

});

angular.module('contactsApp')
	.service('MimeService', function() {
		var magicNumbers = {
			'/9j/' : 'JPEG',
			'R0lGOD' : 'GIF',
			'iVBORw0KGgo' : 'PNG'
		};

		this.b64mime = function(b64string) {
			for (var mn in magicNumbers) {
				if(b64string.startsWith(mn)) return magicNumbers[mn];
			}
			return null;
		};
	});

angular.module('contactsApp')
.service('SearchService', function() {
	var searchTerm = '';

	var observerCallbacks = [];

	this.registerObserverCallback = function(callback) {
		observerCallbacks.push(callback);
	};

	var notifyObservers = function(eventName) {
		var ev = {
			event:eventName,
			searchTerm:searchTerm
		};
		angular.forEach(observerCallbacks, function(callback) {
			callback(ev);
		});
	};

	var SearchProxy = {
		attach: function(search) {
			search.setFilter('contacts', this.filterProxy);
		},
		filterProxy: function(query) {
			searchTerm = query;
			notifyObservers('changeSearch');
		}
	};

	this.getSearchTerm = function() {
		return searchTerm;
	};

	this.cleanSearch = function() {
		if (!_.isUndefined($('.searchbox'))) {
			$('.searchbox')[0].reset();
		}
		searchTerm = '';
	};

	if (!_.isUndefined(OC.Plugins)) {
		OC.Plugins.register('OCA.Search', SearchProxy);
		if (!_.isUndefined(OCA.Search)) {
			OC.Search = new OCA.Search($('#searchbox'), $('#searchresults'));
			$('#searchbox').show();
		}
	}

	if (!_.isUndefined($('.searchbox'))) {
		$('.searchbox')[0].addEventListener('keypress', function(e) {
			if(e.keyCode === 13) {
				notifyObservers('submitSearch');
			}
		});
	}
});

angular.module('contactsApp')
.service('SettingsService', function() {
	var settings = {
		addressBooks: [
			'testAddr'
		]
	};

	this.set = function(key, value) {
		settings[key] = value;
	};

	this.get = function(key) {
		return settings[key];
	};

	this.getAll = function() {
		return settings;
	};
});

angular.module('contactsApp')
.service('SortByService', function () {
	var subscriptions = [];

	// Array of keys to sort by. Ordered by priorities.
	var sortOptions = {
		sortFirstName: ['firstName', 'lastName', 'uid'],
		sortLastName: ['lastName', 'firstName', 'uid'],
		sortDisplayName: ['displayName', 'uid']
	};

	// Key
	var sortBy = 'sortDisplayName';

	var defaultOrder = window.localStorage.getItem('contacts_default_order');
	if (defaultOrder) {
		sortBy = defaultOrder;
	}

	function notifyObservers() {
		angular.forEach(subscriptions, function (subscription) {
			if (typeof subscription === 'function') {
				subscription(sortOptions[sortBy]);
			}
		});
	}

	return {
		subscribe: function (callback) {
			subscriptions.push(callback);
		},
		setSortBy: function (value) {
			sortBy = value;
			window.localStorage.setItem('contacts_default_order', value);
			notifyObservers();
		},
		getSortBy: function () {
			return sortOptions[sortBy];
		},
		getSortByKey: function () {
			return sortBy;
		},
		getSortByList: function () {
			return {
				sortDisplayName: t('contacts', 'Display name'),
				sortFirstName: t('contacts', 'First name'),
				sortLastName: t('contacts', 'Last name')
			};
		}
	};
});

angular.module('contactsApp')
.service('vCardPropertiesService', function() {
	/**
	 * map vCard attributes to internal attributes
	 *
	 * propName: {
	 * 		multiple: [Boolean], // is this prop allowed more than once? (default = false)
	 * 		readableName: [String], // internationalized readable name of prop
	 * 		template: [String], // template name found in /templates/detailItems
	 * 		[...] // optional additional information which might get used by the template
	 *
	 *		options: If multiple options have the same name, the first will be used as default.
	 *				 Others will be merge, but still supported. Order is important!
	 * }
	 */
	this.vCardMeta = {
		nickname: {
			readableName: t('contacts', 'Nickname'),
			template: 'text',
			icon: 'icon-user'
		},
		n: {
			readableName: t('contacts', 'Detailed name'),
			defaultValue: {
				value:['', '', '', '', '']
			},
			template: 'n',
			icon: 'icon-user'
		},
		note: {
			readableName: t('contacts', 'Notes'),
			template: 'textarea',
			icon: 'icon-rename'
		},
		url: {
			multiple: true,
			readableName: t('contacts', 'Website'),
			template: 'url',
			icon: 'icon-public'
		},
		cloud: {
			multiple: true,
			readableName: t('contacts', 'Federated Cloud ID'),
			template: 'text',
			defaultValue: {
				value:[''],
				meta:{type:['HOME']}
			},
			options: [
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'OTHER', name: t('contacts', 'Other')}
			]		},
		adr: {
			multiple: true,
			readableName: t('contacts', 'Address'),
			template: 'adr',
			icon: 'icon-address',
			defaultValue: {
				value:['', '', '', '', '', '', ''],
				meta:{type:['HOME']}
			},
			options: [
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'OTHER', name: t('contacts', 'Other')}
			]
		},
		categories: {
			readableName: t('contacts', 'Groups'),
			template: 'groups'
		},
		bday: {
			readableName: t('contacts', 'Birthday'),
			template: 'date',
			icon: 'icon-calendar-dark'
		},
		anniversary: {
			readableName: t('contacts', 'Anniversary'),
			template: 'date',
			icon: 'icon-calendar-dark'
		},
		deathdate: {
			readableName: t('contacts', 'Date of death'),
			template: 'date',
			icon: 'icon-calendar-dark'
		},
		email: {
			multiple: true,
			readableName: t('contacts', 'Email'),
			template: 'email',
			icon: 'icon-mail',
			defaultValue: {
				value:'',
				meta:{type:['HOME']}
			},
			options: [
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'OTHER', name: t('contacts', 'Other')}
			]
		},
		impp: {
			multiple: true,
			readableName: t('contacts', 'Instant messaging'),
			template: 'username',
			icon: 'icon-comment',
			defaultValue: {
				value:[''],
				meta:{type:['SKYPE']}
			},
			options: [
				{id: 'IRC', name: 'IRC'},
				{id: 'KIK', name: 'KiK'},
				{id: 'SKYPE', name: 'Skype'},
				{id: 'TELEGRAM', name: 'Telegram'},
				{id: 'XMPP', name:'XMPP'}
			]
		},
		tel: {
			multiple: true,
			readableName: t('contacts', 'Phone'),
			template: 'tel',
			icon: 'icon-comment',
			defaultValue: {
				value:'',
				meta:{type:['HOME,VOICE']}
			},
			options: [
				{id: 'HOME,VOICE', name: t('contacts', 'Home')},
				{id: 'HOME', name: t('contacts', 'Home')},
				{id: 'WORK,VOICE', name: t('contacts', 'Work')},
				{id: 'WORK', name: t('contacts', 'Work')},
				{id: 'CELL', name: t('contacts', 'Mobile')},
				{id: 'CELL,VOICE', name: t('contacts', 'Mobile')},
				{id: 'WORK,CELL', name: t('contacts', 'Work mobile')},
				{id: 'FAX', name: t('contacts', 'Fax')},
				{id: 'HOME,FAX', name: t('contacts', 'Fax home')},
				{id: 'WORK,FAX', name: t('contacts', 'Fax work')},
				{id: 'PAGER', name: t('contacts', 'Pager')},
				{id: 'VOICE', name: t('contacts', 'Voice')},
				{id: 'CAR', name: t('contacts', 'Car')},
				{id: 'PAGER', name: t('contacts', 'Pager')},
				{id: 'WORK,PAGER', name: t('contacts', 'Work pager')}
			]
		},
		'X-SOCIALPROFILE': {
			multiple: true,
			readableName: t('contacts', 'Social network'),
			template: 'username',
			defaultValue: {
				value:[''],
				meta:{type:['facebook']}
			},
			options: [
				{id: 'FACEBOOK', name: 'Facebook'},
				{id: 'GITHUB', name: 'GitHub'},
				{id: 'GOOGLEPLUS', name: 'Google+'},
				{id: 'INSTAGRAM', name: 'Instagram'},
				{id: 'LINKEDIN', name: 'LinkedIn'},
				{id: 'PINTEREST', name: 'Pinterest'},
				{id: 'QZONE', name: 'QZone'},
				{id: 'TUMBLR', name: 'Tumblr'},
				{id: 'TWITTER', name: 'Twitter'},
				{id: 'WECHAT', name: 'WeChat'},
				{id: 'YOUTUBE', name: 'YouTube'}


			]
		},
		relationship: {
			readableName: t('contacts', 'Relationship'),
			template: 'select',
			options: [
				{id: 'SPOUSE', name: t('contacts', 'Spouse')},
				{id: 'CHILD', name: t('contacts', 'Child')},
				{id: 'MOTHER', name: t('contacts', 'Mother')},
				{id: 'FATHER', name: t('contacts', 'Father')},
				{id: 'PARENT', name: t('contacts', 'Parent')},
				{id: 'BROTHER', name: t('contacts', 'Brother')},
				{id: 'SISTER', name: t('contacts', 'Sister')},
				{id: 'RELATIVE', name: t('contacts', 'Relative')},
				{id: 'FRIEND', name: t('contacts', 'Friend')},
				{id: 'COLLEAGUE', name: t('contacts', 'Colleague')},
				{id: 'MANAGER', name: t('contacts', 'Manager')},
				{id: 'ASSISTANT', name: t('contacts', 'Assistant')},
			]
		},
		gender: {
			readableName: t('contacts', 'Gender'),
			template: 'select',
			options: [
				{id: 'F', name: t('contacts', 'Female')},
				{id: 'M', name: t('contacts', 'Male')},
				{id: 'O', name: t('contacts', 'Other')}
			]
		}
	};

	this.fieldOrder = [
		'org',
		'title',
		'tel',
		'email',
		'adr',
		'impp',
		'nick',
		'bday',
		'anniversary',
		'deathdate',
		'url',
		'X-SOCIALPROFILE',
		'relationship',
		'note',
		'categories',
		'role',
		'gender'
	];

	this.fieldDefinitions = [];
	for (var prop in this.vCardMeta) {
		this.fieldDefinitions.push({id: prop, name: this.vCardMeta[prop].readableName, multiple: !!this.vCardMeta[prop].multiple});
	}

	this.fallbackMeta = function(property) {
		function capitalize(string) { return string.charAt(0).toUpperCase() + string.slice(1); }
		return {
			name: 'unknown-' + property,
			readableName: capitalize(property),
			template: 'hidden',
			necessity: 'optional',
			hidden: true
		};
	};

	this.getMeta = function(property) {
		return this.vCardMeta[property] || this.fallbackMeta(property);
	};

});

angular.module('contactsApp')
.filter('JSON2vCard', function() {
	return function(input) {
		return vCard.generate(input);
	};
});

angular.module('contactsApp')
.filter('contactColor', function() {
	return function(input) {
		// Check if core has the new color generator
		if(typeof input.toHsl === 'function') {
			var hsl = input.toHsl();
			return 'hsl('+hsl[0]+', '+hsl[1]+'%, '+hsl[2]+'%)';
		} else {
			// If not, we use the old one
			/* global md5 */
			var hash = md5(input).substring(0, 4),
				maxRange = parseInt('ffff', 16),
				hue = parseInt(hash, 16) / maxRange * 256;
			return 'hsl(' + hue + ', 90%, 65%)';
		}
	};
});
angular.module('contactsApp')
.filter('contactGroupFilter', function() {
	'use strict';
	return function (contacts, group) {
		if (typeof contacts === 'undefined') {
			return contacts;
		}
		if (typeof group === 'undefined' || group.toLowerCase() === t('contacts', 'All contacts').toLowerCase()) {
			return contacts;
		}
		var filter = [];
		if (contacts.length > 0) {
			for (var i = 0; i < contacts.length; i++) {
				if (group.toLowerCase() === t('contacts', 'Not grouped').toLowerCase()) {
					if (contacts[i].categories().length === 0) {
						filter.push(contacts[i]);
					}
				} else {
					if (contacts[i].categories().indexOf(group) >= 0) {
						filter.push(contacts[i]);
					}
				}
			}
		}
		return filter;
	};
});

// from https://docs.nextcloud.com/server/11/developer_manual/app/css.html#menus
angular.module('contactsApp')
.filter('counterFormatter', function () {
	'use strict';
	return function (count) {
		if (count > 9999) {
			return '9999+';
		}
		if (count === 0) {
			return '';
		}
		return count;
	};
});


angular.module('contactsApp')
.filter('fieldFilter', function() {
	'use strict';
	return function (fields, contact) {
		if (typeof fields === 'undefined') {
			return fields;
		}
		if (typeof contact === 'undefined') {
			return fields;
		}
		var filter = [];
		if (fields.length > 0) {
			for (var i = 0; i < fields.length; i++) {
				if (fields[i].multiple ) {
					filter.push(fields[i]);
					continue;
				}
				if (_.isUndefined(contact.getProperty(fields[i].id))) {
					filter.push(fields[i]);
				}
			}
		}
		return filter;
	};
});

angular.module('contactsApp')
.filter('firstCharacter', function() {
	return function(input) {
		return input.charAt(0);
	};
});

angular.module('contactsApp')
.filter('localeOrderBy', [function () {
	return function (array, sortPredicate, reverseOrder) {
		if (!Array.isArray(array)) return array;
		if (!sortPredicate) return array;

		var arrayCopy = [];
		angular.forEach(array, function (item) {
			arrayCopy.push(item);
		});

		arrayCopy.sort(function (a, b) {


			// Did we pass multiple sorting options? If not, create an array anyway.
			sortPredicate = angular.isArray(sortPredicate) ? sortPredicate: [sortPredicate];
			// Let's test the first sort and continue if no sort occured
			for(var i=0; i<sortPredicate.length; i++) {
				var sortBy = sortPredicate[i];

				var valueA = a[sortBy];
				if (angular.isFunction(valueA)) {
					valueA = a[sortBy]();
				}
				var valueB = b[sortBy];
				if (angular.isFunction(valueB)) {
					valueB = b[sortBy]();
				}

				// Start sorting
				if (angular.isString(valueA)) {
					if(valueA !== valueB) {
						return reverseOrder ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
					}
				}

				if (angular.isNumber(valueA) || typeof valueA === 'boolean') {
					if(valueA !== valueB) {
						return reverseOrder ? valueB - valueA : valueA - valueB;
					}
				}
			}

			return 0;
		});

		return arrayCopy;
	};
}]);

angular.module('contactsApp')
.filter('newContact', function() {
	return function(input) {
		return input !== '' ? input : t('contacts', 'New contact');
	};
});

angular.module('contactsApp')
.filter('orderDetailItems', ['vCardPropertiesService', function(vCardPropertiesService) {
	'use strict';
	return function(items, field, reverse) {

		var filtered = [];
		angular.forEach(items, function(item) {
			filtered.push(item);
		});

		var fieldOrder = angular.copy(vCardPropertiesService.fieldOrder);
		// reverse to move custom items to the end (indexOf == -1)
		fieldOrder.reverse();

		filtered.sort(function (a, b) {
			if(fieldOrder.indexOf(a[field]) < fieldOrder.indexOf(b[field])) {
				return 1;
			}
			if(fieldOrder.indexOf(a[field]) > fieldOrder.indexOf(b[field])) {
				return -1;
			}
			return 0;
		});

		if(reverse) filtered.reverse();
		return filtered;
	};
}]);

angular.module('contactsApp')
.filter('toArray', function() {
	return function(obj) {
		if (!(obj instanceof Object)) return obj;
		return _.map(obj, function(val, key) {
			return Object.defineProperty(val, '$key', {value: key});
		});
	};
});

angular.module('contactsApp')
.filter('vCard2JSON', function() {
	return function(input) {
		return vCard.parse(input);
	};
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJkYXRlcGlja2VyX2RpcmVjdGl2ZS5qcyIsImZvY3VzX2RpcmVjdGl2ZS5qcyIsImlucHV0cmVzaXplX2RpcmVjdGl2ZS5qcyIsInNlbGVjdF9kaXJlY3RpdmUuanMiLCJhZGRyZXNzQm9vay9hZGRyZXNzQm9va19jb250cm9sbGVyLmpzIiwiYWRkcmVzc0Jvb2svYWRkcmVzc0Jvb2tfZGlyZWN0aXZlLmpzIiwiYWRkcmVzc0Jvb2tMaXN0L2FkZHJlc3NCb29rTGlzdF9jb250cm9sbGVyLmpzIiwiYWRkcmVzc0Jvb2tMaXN0L2FkZHJlc3NCb29rTGlzdF9kaXJlY3RpdmUuanMiLCJhdmF0YXIvYXZhdGFyX2NvbnRyb2xsZXIuanMiLCJhdmF0YXIvYXZhdGFyX2RpcmVjdGl2ZS5qcyIsImNvbnRhY3REZXRhaWxzL2NvbnRhY3REZXRhaWxzX2NvbnRyb2xsZXIuanMiLCJjb250YWN0RGV0YWlscy9jb250YWN0RGV0YWlsc19kaXJlY3RpdmUuanMiLCJjb250YWN0L2NvbnRhY3RfY29udHJvbGxlci5qcyIsImNvbnRhY3QvY29udGFjdF9kaXJlY3RpdmUuanMiLCJjb250YWN0RmlsdGVyL2NvbnRhY3RGaWx0ZXJfY29udHJvbGxlci5qcyIsImNvbnRhY3RGaWx0ZXIvY29udGFjdEZpbHRlcl9kaXJlY3RpdmUuanMiLCJjb250YWN0SW1wb3J0L2NvbnRhY3RJbXBvcnRfY29udHJvbGxlci5qcyIsImNvbnRhY3RJbXBvcnQvY29udGFjdEltcG9ydF9kaXJlY3RpdmUuanMiLCJjb250YWN0TGlzdC9jb250YWN0TGlzdF9jb250cm9sbGVyLmpzIiwiY29udGFjdExpc3QvY29udGFjdExpc3RfZGlyZWN0aXZlLmpzIiwiZGV0YWlsc0l0ZW0vZGV0YWlsc0l0ZW1fY29udHJvbGxlci5qcyIsImRldGFpbHNJdGVtL2RldGFpbHNJdGVtX2RpcmVjdGl2ZS5qcyIsImdyb3VwL2dyb3VwX2NvbnRyb2xsZXIuanMiLCJncm91cC9ncm91cF9kaXJlY3RpdmUuanMiLCJncm91cExpc3QvZ3JvdXBMaXN0X2NvbnRyb2xsZXIuanMiLCJncm91cExpc3QvZ3JvdXBMaXN0X2RpcmVjdGl2ZS5qcyIsImltcG9ydFNjcmVlbi9pbXBvcnRTY3JlZW5fY29udHJvbGxlci5qcyIsImltcG9ydFNjcmVlbi9pbXBvcnRTY3JlZW5fZGlyZWN0aXZlLmpzIiwibmV3Q29udGFjdEJ1dHRvbi9uZXdDb250YWN0QnV0dG9uX2NvbnRyb2xsZXIuanMiLCJuZXdDb250YWN0QnV0dG9uL25ld0NvbnRhY3RCdXR0b25fZGlyZWN0aXZlLmpzIiwicGFyc2Vycy90ZWxNb2RlbF9kaXJlY3RpdmUuanMiLCJwcm9wZXJ0eUdyb3VwL3Byb3BlcnR5R3JvdXBfY29udHJvbGxlci5qcyIsInByb3BlcnR5R3JvdXAvcHJvcGVydHlHcm91cF9kaXJlY3RpdmUuanMiLCJzb3J0Qnkvc29ydEJ5X2NvbnRyb2xsZXIuanMiLCJzb3J0Qnkvc29ydEJ5X2RpcmVjdGl2ZS5qcyIsImFkZHJlc3NCb29rX21vZGVsLmpzIiwiY29udGFjdEZpbHRlcl9tb2RlbC5qcyIsImNvbnRhY3RfbW9kZWwuanMiLCJncm91cF9tb2RlbC5qcyIsImFkZHJlc3NCb29rX3NlcnZpY2UuanMiLCJjb250YWN0X3NlcnZpY2UuanMiLCJkYXZDbGllbnRfc2VydmljZS5qcyIsImRhdl9zZXJ2aWNlLmpzIiwiaW1wb3J0X3NlcnZpY2UuanMiLCJtaW1lX3NlcnZpY2UuanMiLCJzZWFyY2hfc2VydmljZS5qcyIsInNldHRpbmdzX3NlcnZpY2UuanMiLCJzb3J0Qnlfc2VydmljZS5qcyIsInZDYXJkUHJvcGVydGllcy5qcyIsIkpTT04ydkNhcmRfZmlsdGVyLmpzIiwiY29udGFjdENvbG9yX2ZpbHRlci5qcyIsImNvbnRhY3RHcm91cF9maWx0ZXIuanMiLCJjb3VudGVyRm9ybWF0dGVyX2ZpbHRlci5qcyIsImZpZWxkX2ZpbHRlci5qcyIsImZpcnN0Q2hhcmFjdGVyX2ZpbHRlci5qcyIsImxvY2FsZU9yZGVyQnlfZmlsdGVyLmpzIiwibmV3Q29udGFjdF9maWx0ZXIuanMiLCJvcmRlckRldGFpbEl0ZW1zX2ZpbHRlci5qcyIsInRvQXJyYXlfZmlsdGVyLmpzIiwidkNhcmQySlNPTl9maWx0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7QUFVQSxRQUFRLE9BQU8sZUFBZSxDQUFDLFNBQVMsaUJBQWlCLFdBQVcsZ0JBQWdCLGFBQWEsY0FBYyx5QkFBeUI7Q0FDdkksMEJBQU8sU0FBUyxnQkFBZ0I7O0NBRWhDLGVBQWUsS0FBSyxTQUFTO0VBQzVCLFVBQVU7OztDQUdYLGVBQWUsS0FBSyxpQkFBaUI7RUFDcEMsWUFBWSxTQUFTLFlBQVk7R0FDaEMsT0FBTyxNQUFNLEVBQUUsWUFBWSxrQkFBa0IsTUFBTSxXQUFXOzs7O0NBSWhFLGVBQWUsS0FBSyxjQUFjO0VBQ2pDLFVBQVU7OztDQUdYLGVBQWUsVUFBVSxNQUFNLEVBQUUsWUFBWTs7O0FBRzlDO0FDOUJBLFFBQVEsT0FBTztDQUNkLFVBQVUsMkJBQWMsU0FBUyxVQUFVO0NBQzNDLElBQUksaUJBQWlCLFVBQVUsT0FBTyxTQUFTLE9BQU8sYUFBYTtFQUNsRSxTQUFTLFdBQVc7R0FDbkIsUUFBUSxXQUFXO0lBQ2xCLFdBQVc7SUFDWCxTQUFTO0lBQ1QsU0FBUztJQUNULGdCQUFnQjtJQUNoQixTQUFTLFVBQVUsTUFBTSxJQUFJO0tBQzVCLElBQUksR0FBRyxlQUFlLE1BQU07TUFDM0IsT0FBTyxNQUFNOztLQUVkLElBQUksR0FBRyxlQUFlLEtBQUs7TUFDMUIsT0FBTyxNQUFNOztLQUVkLElBQUksR0FBRyxlQUFlLElBQUk7TUFDekIsT0FBTyxNQUFNOztLQUVkLFlBQVksY0FBYztLQUMxQixNQUFNOzs7OztDQUtWLE9BQU87RUFDTixVQUFVO0VBQ1YsVUFBVTtFQUNWLFlBQVk7RUFDWixPQUFPOzs7QUFHVDtBQ2hDQSxRQUFRLE9BQU87Q0FDZCxVQUFVLGdDQUFtQixVQUFVLFVBQVU7Q0FDakQsT0FBTztFQUNOLFVBQVU7RUFDVixNQUFNO0dBQ0wsTUFB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Tzs7OztBQUlyRDtBQ1RBLFFBQVEsT0FBTztDQUNkLE9BQU8sY0FBYyxXQUFXO0NBQ2hDLE9BQU8sU0FBUyxPQUFPO0VBQ3RCLE9BQU8sTUFBTSxNQUFNOzs7QUFHckIiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBOZXh0Y2xvdWQgLSBjb250YWN0c1xuICpcbiAqIFRoaXMgZmlsZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQWZmZXJvIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgdmVyc2lvbiAzIG9yXG4gKiBsYXRlci4gU2VlIHRoZSBDT1BZSU5HIGZpbGUuXG4gKlxuICogQGF1dGhvciBIZW5kcmlrIExlcHBlbHNhY2sgPGhlbmRyaWtAbGVwcGVsc2Fjay5kZT5cbiAqIEBjb3B5cmlnaHQgSGVuZHJpayBMZXBwZWxzYWNrIDIwMTVcbiAqL1xuXG5hbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnLCBbJ3V1aWQ0JywgJ2FuZ3VsYXItY2FjaGUnLCAnbmdSb3V0ZScsICd1aS5ib290c3RyYXAnLCAndWkuc2VsZWN0JywgJ25nU2FuaXRpemUnLCAnYW5ndWxhci1jbGljay1vdXRzaWRlJywgJ25nY2xpcGJvYXJkJ10pXG4uY29uZmlnKGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKSB7XG5cblx0JHJvdXRlUHJvdmlkZXIud2hlbignLzpnaWQnLCB7XG5cdFx0dGVtcGxhdGU6ICc8Y29udGFjdGRldGFpbHM+PC9jb250YWN0ZGV0YWlscz4nXG5cdH0pO1xuXG5cdCRyb3V0ZVByb3ZpZGVyLndoZW4oJy9jb250YWN0Lzp1aWQnLCB7XG5cdFx0cmVkaXJlY3RUbzogZnVuY3Rpb24ocGFyYW1ldGVycykge1xuXHRcdFx0cmV0dXJuICcvJyArIHQoJ2NvbnRhY3RzJywgJ0FsbCBjb250YWN0cycpICsgJy8nICsgcGFyYW1ldGVycy51aWQ7XG5cdFx0fVxuXHR9KTtcblxuXHQkcm91dGVQcm92aWRlci53aGVuKCcvOmdpZC86dWlkJywge1xuXHRcdHRlbXBsYXRlOiAnPGNvbnRhY3RkZXRhaWxzPjwvY29udGFjdGRldGFpbHM+J1xuXHR9KTtcblxuXHQkcm91dGVQcm92aWRlci5vdGhlcndpc2UoJy8nICsgdCgnY29udGFjdHMnLCAnQWxsIGNvbnRhY3RzJykpO1xuXG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdkYXRlcGlja2VyJywgZnVuY3Rpb24oJHRpbWVvdXQpIHtcblx0dmFyIGxvYWREYXRlcGlja2VyID0gZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbEN0cmwpIHtcblx0XHQkdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdGVsZW1lbnQuZGF0ZXBpY2tlcih7XG5cdFx0XHRcdGRhdGVGb3JtYXQ6J3l5LW1tLWRkJyxcblx0XHRcdFx0bWluRGF0ZTogbnVsbCxcblx0XHRcdFx0bWF4RGF0ZTogbnVsbCxcblx0XHRcdFx0Y29uc3RyYWluSW5wdXQ6IGZhbHNlLFxuXHRcdFx0XHRvblNlbGVjdDpmdW5jdGlvbiAoZGF0ZSwgZHApIHtcblx0XHRcdFx0XHRpZiAoZHAuc2VsZWN0ZWRZZWFyIDwgMTAwMCkge1xuXHRcdFx0XHRcdFx0ZGF0ZSA9ICcwJyArIGRhdGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkcC5zZWxlY3RlZFllYXIgPCAxMDApIHtcblx0XHRcdFx0XHRcdGRhdGUgPSAnMCcgKyBkYXRlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZHAuc2VsZWN0ZWRZZWFyIDwgMTApIHtcblx0XHRcdFx0XHRcdGRhdGUgPSAnMCcgKyBkYXRlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRuZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKGRhdGUpO1xuXHRcdFx0XHRcdHNjb3BlLiRhcHBseSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fTtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0EnLFxuXHRcdHJlcXVpcmUgOiAnbmdNb2RlbCcsXG5cdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRsaW5rIDogbG9hZERhdGVwaWNrZXJcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2ZvY3VzRXhwcmVzc2lvbicsIGZ1bmN0aW9uICgkdGltZW91dCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnQScsXG5cdFx0bGluazoge1xuXHRcdFx0cG9zdDogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cdFx0XHRcdHNjb3BlLiR3YXRjaChhdHRycy5mb2N1c0V4cHJlc3Npb24sIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRpZiAoYXR0cnMuZm9jdXNFeHByZXNzaW9uKSB7XG5cdFx0XHRcdFx0XHRpZiAoc2NvcGUuJGV2YWwoYXR0cnMuZm9jdXNFeHByZXNzaW9uKSkge1xuXHRcdFx0XHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGVsZW1lbnQuaXMoJ2lucHV0JykpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQuZm9jdXMoKTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZWxlbWVudC5maW5kKCdpbnB1dCcpLmZvY3VzKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9LCAxMDApOyAvL25lZWQgc29tZSBkZWxheSB0byB3b3JrIHdpdGggbmctZGlzYWJsZWRcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2lucHV0cmVzaXplJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdBJyxcblx0XHRsaW5rIDogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XG5cdFx0XHR2YXIgZWxJbnB1dCA9IGVsZW1lbnQudmFsKCk7XG5cdFx0XHRlbGVtZW50LmJpbmQoJ2tleWRvd24ga2V5dXAgbG9hZCBmb2N1cycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRlbElucHV0ID0gZWxlbWVudC52YWwoKTtcblx0XHRcdFx0Ly8gSWYgc2V0IHRvIDAsIHRoZSBtaW4td2lkdGggY3NzIGRhdGEgaXMgaWdub3JlZFxuXHRcdFx0XHR2YXIgbGVuZ3RoID0gZWxJbnB1dC5sZW5ndGggPiAxID8gZWxJbnB1dC5sZW5ndGggOiAxO1xuXHRcdFx0XHRlbGVtZW50LmF0dHIoJ3NpemUnLCBsZW5ndGgpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgnc2VsZWN0RXhwcmVzc2lvbicsIGZ1bmN0aW9uICgkdGltZW91dCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnQScsXG5cdFx0bGluazoge1xuXHRcdFx0cG9zdDogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cdFx0XHRcdHNjb3BlLiR3YXRjaChhdHRycy5zZWxlY3RFeHByZXNzaW9uLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0aWYgKGF0dHJzLnNlbGVjdEV4cHJlc3Npb24pIHtcblx0XHRcdFx0XHRcdGlmIChzY29wZS4kZXZhbChhdHRycy5zZWxlY3RFeHByZXNzaW9uKSkge1xuXHRcdFx0XHRcdFx0XHQkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGVsZW1lbnQuaXMoJ2lucHV0JykpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQuc2VsZWN0KCk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQuZmluZCgnaW5wdXQnKS5zZWxlY3QoKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0sIDEwMCk7IC8vbmVlZCBzb21lIGRlbGF5IHRvIHdvcmsgd2l0aCBuZy1kaXNhYmxlZFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2FkZHJlc3Nib29rQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQWRkcmVzc0Jvb2tTZXJ2aWNlKSB7XG5cdHZhciBjdHJsID0gdGhpcztcblxuXHRjdHJsLnQgPSB7XG5cdFx0ZG93bmxvYWQ6IHQoJ2NvbnRhY3RzJywgJ0Rvd25sb2FkJyksXG5cdFx0Y29weVVSTDogdCgnY29udGFjdHMnLCAnQ29weSBsaW5rJyksXG5cdFx0Y2xpY2tUb0NvcHk6IHQoJ2NvbnRhY3RzJywgJ0NsaWNrIHRvIGNvcHkgdGhlIGxpbmsgdG8geW91ciBjbGlwYm9hcmQnKSxcblx0XHRzaGFyZUFkZHJlc3Nib29rOiB0KCdjb250YWN0cycsICdUb2dnbGUgc2hhcmluZycpLFxuXHRcdGRlbGV0ZUFkZHJlc3Nib29rOiB0KCdjb250YWN0cycsICdEZWxldGUnKSxcblx0XHRyZW5hbWVBZGRyZXNzYm9vazogdCgnY29udGFjdHMnLCAnUmVuYW1lJyksXG5cdFx0c2hhcmVJbnB1dFBsYWNlSG9sZGVyOiB0KCdjb250YWN0cycsICdTaGFyZSB3aXRoIHVzZXJzIG9yIGdyb3VwcycpLFxuXHRcdGRlbGV0ZTogdCgnY29udGFjdHMnLCAnRGVsZXRlJyksXG5cdFx0Y2FuRWRpdDogdCgnY29udGFjdHMnLCAnY2FuIGVkaXQnKSxcblx0XHRjbG9zZTogdCgnY29udGFjdHMnLCAnQ2xvc2UnKSxcblx0XHRlbmFibGVkOiB0KCdjb250YWN0cycsICdFbmFibGVkJyksXG5cdFx0ZGlzYWJsZWQ6IHQoJ2NvbnRhY3RzJywgJ0Rpc2FibGVkJylcblx0fTtcblxuXHRjdHJsLmVkaXRpbmcgPSBmYWxzZTtcblx0Y3RybC5lbmFibGVkID0gY3RybC5hZGRyZXNzQm9vay5lbmFibGVkO1xuXG5cdGN0cmwudG9vbHRpcElzT3BlbiA9IGZhbHNlO1xuXHRjdHJsLnRvb2x0aXBUaXRsZSA9IGN0cmwudC5jbGlja1RvQ29weTtcblx0Y3RybC5zaG93SW5wdXRVcmwgPSBmYWxzZTtcblxuXHRjdHJsLmNsaXBib2FyZFN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcblx0XHRjdHJsLnRvb2x0aXBJc09wZW4gPSB0cnVlO1xuXHRcdGN0cmwudG9vbHRpcFRpdGxlID0gdCgnY29yZScsICdDb3BpZWQhJyk7XG5cdFx0Xy5kZWxheShmdW5jdGlvbigpIHtcblx0XHRcdGN0cmwudG9vbHRpcElzT3BlbiA9IGZhbHNlO1xuXHRcdFx0Y3RybC50b29sdGlwVGl0bGUgPSBjdHJsLnQuY2xpY2tUb0NvcHk7XG5cdFx0fSwgMzAwMCk7XG5cdH07XG5cblx0Y3RybC5jbGlwYm9hcmRFcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdGN0cmwuc2hvd0lucHV0VXJsID0gdHJ1ZTtcblx0XHRpZiAoL2lQaG9uZXxpUGFkL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdFx0Y3RybC5JbnB1dFVybFRvb2x0aXAgPSB0KCdjb3JlJywgJ05vdCBzdXBwb3J0ZWQhJyk7XG5cdFx0fSBlbHNlIGlmICgvTWFjL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdFx0Y3RybC5JbnB1dFVybFRvb2x0aXAgPSB0KCdjb3JlJywgJ1ByZXNzIOKMmC1DIHRvIGNvcHkuJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGN0cmwuSW5wdXRVcmxUb29sdGlwID0gdCgnY29yZScsICdQcmVzcyBDdHJsLUMgdG8gY29weS4nKTtcblx0XHR9XG5cdFx0JCgnI2FkZHJlc3NCb29rVXJsXycrY3RybC5hZGRyZXNzQm9vay5jdGFnKS5zZWxlY3QoKTtcblx0fTtcblxuXHRjdHJsLnJlbmFtZUFkZHJlc3NCb29rID0gZnVuY3Rpb24oKSB7XG5cdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnJlbmFtZShjdHJsLmFkZHJlc3NCb29rLCBjdHJsLmFkZHJlc3NCb29rLmRpc3BsYXlOYW1lKTtcblx0XHRjdHJsLmVkaXRpbmcgPSBmYWxzZTtcblx0fTtcblxuXHRjdHJsLmVkaXQgPSBmdW5jdGlvbigpIHtcblx0XHRjdHJsLmVkaXRpbmcgPSB0cnVlO1xuXHR9O1xuXG5cdGN0cmwuY2xvc2VNZW51cyA9IGZ1bmN0aW9uKCkge1xuXHRcdCRzY29wZS4kcGFyZW50LmN0cmwub3BlbmVkTWVudSA9IGZhbHNlO1xuXHR9O1xuXG5cdGN0cmwub3Blbk1lbnUgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdGN0cmwuY2xvc2VNZW51cygpO1xuXHRcdCRzY29wZS4kcGFyZW50LmN0cmwub3BlbmVkTWVudSA9IGluZGV4O1xuXHR9O1xuXG5cdGN0cmwudG9nZ2xlTWVudSA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cdFx0aWYgKCRzY29wZS4kcGFyZW50LmN0cmwub3BlbmVkTWVudSA9PT0gaW5kZXgpIHtcblx0XHRcdGN0cmwuY2xvc2VNZW51cygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdHJsLm9wZW5NZW51KGluZGV4KTtcblx0XHR9XG5cdH07XG5cblx0Y3RybC50b2dnbGVTaGFyZXNFZGl0b3IgPSBmdW5jdGlvbigpIHtcblx0XHRjdHJsLmVkaXRpbmdTaGFyZXMgPSAhY3RybC5lZGl0aW5nU2hhcmVzO1xuXHRcdGN0cmwuc2VsZWN0ZWRTaGFyZWUgPSBudWxsO1xuXHR9O1xuXG5cdC8qIEZyb20gQ2FsZW5kYXItUmV3b3JrIC0ganMvYXBwL2NvbnRyb2xsZXJzL2NhbGVuZGFybGlzdGNvbnRyb2xsZXIuanMgKi9cblx0Y3RybC5maW5kU2hhcmVlID0gZnVuY3Rpb24gKHZhbCkge1xuXHRcdHJldHVybiAkLmdldChcblx0XHRcdE9DLmxpbmtUb09DUygnYXBwcy9maWxlc19zaGFyaW5nL2FwaS92MScpICsgJ3NoYXJlZXMnLFxuXHRcdFx0e1xuXHRcdFx0XHRmb3JtYXQ6ICdqc29uJyxcblx0XHRcdFx0c2VhcmNoOiB2YWwudHJpbSgpLFxuXHRcdFx0XHRwZXJQYWdlOiAyMDAsXG5cdFx0XHRcdGl0ZW1UeXBlOiAncHJpbmNpcGFscydcblx0XHRcdH1cblx0XHQpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG5cdFx0XHR2YXIgdXNlcnMgICA9IHJlc3VsdC5vY3MuZGF0YS5leGFjdC51c2Vycy5jb25jYXQocmVzdWx0Lm9jcy5kYXRhLnVzZXJzKTtcblx0XHRcdHZhciBncm91cHMgID0gcmVzdWx0Lm9jcy5kYXRhLmV4YWN0Lmdyb3Vwcy5jb25jYXQocmVzdWx0Lm9jcy5kYXRhLmdyb3Vwcyk7XG5cblx0XHRcdHZhciB1c2VyU2hhcmVzID0gY3RybC5hZGRyZXNzQm9vay5zaGFyZWRXaXRoLnVzZXJzO1xuXHRcdFx0dmFyIHVzZXJTaGFyZXNMZW5ndGggPSB1c2VyU2hhcmVzLmxlbmd0aDtcblxuXHRcdFx0dmFyIGdyb3Vwc1NoYXJlcyA9IGN0cmwuYWRkcmVzc0Jvb2suc2hhcmVkV2l0aC5ncm91cHM7XG5cdFx0XHR2YXIgZ3JvdXBzU2hhcmVzTGVuZ3RoID0gZ3JvdXBzU2hhcmVzLmxlbmd0aDtcblx0XHRcdHZhciBpLCBqO1xuXG5cdFx0XHQvLyBGaWx0ZXIgb3V0IGN1cnJlbnQgdXNlclxuXHRcdFx0Zm9yIChpID0gMCA7IGkgPCB1c2Vycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAodXNlcnNbaV0udmFsdWUuc2hhcmVXaXRoID09PSBPQy5jdXJyZW50VXNlcikge1xuXHRcdFx0XHRcdHVzZXJzLnNwbGljZShpLCAxKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBOb3cgZmlsdGVyIG91dCBhbGwgc2hhcmVlcyB0aGF0IGFyZSBhbHJlYWR5IHNoYXJlZCB3aXRoXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgdXNlclNoYXJlc0xlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBzaGFyZVVzZXIgPSB1c2VyU2hhcmVzW2ldO1xuXHRcdFx0XHRmb3IgKGogPSAwOyBqIDwgdXNlcnMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0XHRpZiAodXNlcnNbal0udmFsdWUuc2hhcmVXaXRoID09PSBzaGFyZVVzZXIuaWQpIHtcblx0XHRcdFx0XHRcdHVzZXJzLnNwbGljZShqLCAxKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBOb3cgZmlsdGVyIG91dCBhbGwgZ3JvdXBzIHRoYXQgYXJlIGFscmVhZHkgc2hhcmVkIHdpdGhcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBncm91cHNTaGFyZXNMZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgc2hhcmVkR3JvdXAgPSBncm91cHNTaGFyZXNbaV07XG5cdFx0XHRcdGZvciAoaiA9IDA7IGogPCBncm91cHMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0XHRpZiAoZ3JvdXBzW2pdLnZhbHVlLnNoYXJlV2l0aCA9PT0gc2hhcmVkR3JvdXAuaWQpIHtcblx0XHRcdFx0XHRcdGdyb3Vwcy5zcGxpY2UoaiwgMSk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gQ29tYmluZSB1c2VycyBhbmQgZ3JvdXBzXG5cdFx0XHR1c2VycyA9IHVzZXJzLm1hcChmdW5jdGlvbihpdGVtKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZGlzcGxheTogXy5lc2NhcGUoaXRlbS52YWx1ZS5zaGFyZVdpdGgpLFxuXHRcdFx0XHRcdHR5cGU6IE9DLlNoYXJlLlNIQVJFX1RZUEVfVVNFUixcblx0XHRcdFx0XHRpZGVudGlmaWVyOiBpdGVtLnZhbHVlLnNoYXJlV2l0aFxuXHRcdFx0XHR9O1xuXHRcdFx0fSk7XG5cblx0XHRcdGdyb3VwcyA9IGdyb3Vwcy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGRpc3BsYXk6IF8uZXNjYXBlKGl0ZW0udmFsdWUuc2hhcmVXaXRoKSArICcgKGdyb3VwKScsXG5cdFx0XHRcdFx0dHlwZTogT0MuU2hhcmUuU0hBUkVfVFlQRV9HUk9VUCxcblx0XHRcdFx0XHRpZGVudGlmaWVyOiBpdGVtLnZhbHVlLnNoYXJlV2l0aFxuXHRcdFx0XHR9O1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBncm91cHMuY29uY2F0KHVzZXJzKTtcblx0XHR9KTtcblx0fTtcblxuXHRjdHJsLm9uU2VsZWN0U2hhcmVlID0gZnVuY3Rpb24gKGl0ZW0pIHtcblx0XHQvLyBQcmV2ZW50IHNldHRpbmdzIHRvIHNsaWRlIGRvd25cblx0XHQkKCcjYXBwLXNldHRpbmdzLWhlYWRlciA+IGJ1dHRvbicpLmRhdGEoJ2FwcHMtc2xpZGUtdG9nZ2xlJywgZmFsc2UpO1xuXHRcdF8uZGVsYXkoZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCcjYXBwLXNldHRpbmdzLWhlYWRlciA+IGJ1dHRvbicpLmRhdGEoJ2FwcHMtc2xpZGUtdG9nZ2xlJywgJyNhcHAtc2V0dGluZ3MtY29udGVudCcpO1xuXHRcdH0sIDUwMCk7XG5cblx0XHRjdHJsLnNlbGVjdGVkU2hhcmVlID0gbnVsbDtcblx0XHRBZGRyZXNzQm9va1NlcnZpY2Uuc2hhcmUoY3RybC5hZGRyZXNzQm9vaywgaXRlbS50eXBlLCBpdGVtLmlkZW50aWZpZXIsIGZhbHNlLCBmYWxzZSkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdCRzY29wZS4kYXBwbHkoKTtcblx0XHR9KTtcblxuXHR9O1xuXG5cdGN0cmwudXBkYXRlRXhpc3RpbmdVc2VyU2hhcmUgPSBmdW5jdGlvbih1c2VySWQsIHdyaXRhYmxlKSB7XG5cdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnNoYXJlKGN0cmwuYWRkcmVzc0Jvb2ssIE9DLlNoYXJlLlNIQVJFX1RZUEVfVVNFUiwgdXNlcklkLCB3cml0YWJsZSwgdHJ1ZSkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdCRzY29wZS4kYXBwbHkoKTtcblx0XHR9KTtcblx0fTtcblxuXHRjdHJsLnVwZGF0ZUV4aXN0aW5nR3JvdXBTaGFyZSA9IGZ1bmN0aW9uKGdyb3VwSWQsIHdyaXRhYmxlKSB7XG5cdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnNoYXJlKGN0cmwuYWRkcmVzc0Jvb2ssIE9DLlNoYXJlLlNIQVJFX1RZUEVfR1JPVVAsIGdyb3VwSWQsIHdyaXRhYmxlLCB0cnVlKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGN0cmwudW5zaGFyZUZyb21Vc2VyID0gZnVuY3Rpb24odXNlcklkKSB7XG5cdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnVuc2hhcmUoY3RybC5hZGRyZXNzQm9vaywgT0MuU2hhcmUuU0hBUkVfVFlQRV9VU0VSLCB1c2VySWQpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y3RybC51bnNoYXJlRnJvbUdyb3VwID0gZnVuY3Rpb24oZ3JvdXBJZCkge1xuXHRcdEFkZHJlc3NCb29rU2VydmljZS51bnNoYXJlKGN0cmwuYWRkcmVzc0Jvb2ssIE9DLlNoYXJlLlNIQVJFX1RZUEVfR1JPVVAsIGdyb3VwSWQpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y3RybC5kZWxldGVBZGRyZXNzQm9vayA9IGZ1bmN0aW9uKCkge1xuXHRcdEFkZHJlc3NCb29rU2VydmljZS5kZWxldGUoY3RybC5hZGRyZXNzQm9vaykudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdCRzY29wZS4kYXBwbHkoKTtcblx0XHR9KTtcblx0fTtcblxuXHRjdHJsLnRvZ2dsZVN0YXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnRvZ2dsZVN0YXRlKGN0cmwuYWRkcmVzc0Jvb2spLnRoZW4oZnVuY3Rpb24oYWRkcmVzc0Jvb2spIHtcblx0XHRcdGN0cmwuZW5hYmxlZCA9IGFkZHJlc3NCb29rLmVuYWJsZWQ7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KCk7XG5cdFx0fSk7XG5cdH07XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2FkZHJlc3Nib29rJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdBJywgLy8gaGFzIHRvIGJlIGFuIGF0dHJpYnV0ZSB0byB3b3JrIHdpdGggY29yZSBjc3Ncblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2FkZHJlc3Nib29rQ3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge1xuXHRcdFx0YWRkcmVzc0Jvb2s6ICc9ZGF0YScsXG5cdFx0XHRsaXN0OiAnPSdcblx0XHR9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9hZGRyZXNzQm9vay5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdhZGRyZXNzYm9va2xpc3RDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBBZGRyZXNzQm9va1NlcnZpY2UpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwubG9hZGluZyA9IHRydWU7XG5cdGN0cmwub3BlbmVkTWVudSA9IGZhbHNlO1xuXHRjdHJsLmFkZHJlc3NCb29rUmVnZXggPSAvXlthLXpBLVowLTnDgC3Dv1xccy1fLiE/I3woKV0rJC9pO1xuXG5cdEFkZHJlc3NCb29rU2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rcykge1xuXHRcdGN0cmwuYWRkcmVzc0Jvb2tzID0gYWRkcmVzc0Jvb2tzO1xuXHRcdGN0cmwubG9hZGluZyA9IGZhbHNlO1xuXHRcdGlmKGN0cmwuYWRkcmVzc0Jvb2tzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmNyZWF0ZSh0KCdjb250YWN0cycsICdDb250YWN0cycpKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRBZGRyZXNzQm9va1NlcnZpY2UuZ2V0QWRkcmVzc0Jvb2sodCgnY29udGFjdHMnLCAnQ29udGFjdHMnKSkudGhlbihmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0XHRcdGN0cmwuYWRkcmVzc0Jvb2tzLnB1c2goYWRkcmVzc0Jvb2spO1xuXHRcdFx0XHRcdCRzY29wZS4kYXBwbHkoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pO1xuXG5cdGN0cmwudCA9IHtcblx0XHRhZGRyZXNzQm9va05hbWUgOiB0KCdjb250YWN0cycsICdBZGRyZXNzIGJvb2sgbmFtZScpLFxuXHRcdHJlZ2V4RXJyb3IgOiB0KCdjb250YWN0cycsICdPbmx5IHRoZXNlIHNwZWNpYWwgY2hhcmFjdGVycyBhcmUgYWxsb3dlZDogLV8uIT8jfCgpJylcblx0fTtcblxuXHRjdHJsLmNyZWF0ZUFkZHJlc3NCb29rID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYoY3RybC5uZXdBZGRyZXNzQm9va05hbWUpIHtcblx0XHRcdEFkZHJlc3NCb29rU2VydmljZS5jcmVhdGUoY3RybC5uZXdBZGRyZXNzQm9va05hbWUpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdEFkZHJlc3NCb29rU2VydmljZS5nZXRBZGRyZXNzQm9vayhjdHJsLm5ld0FkZHJlc3NCb29rTmFtZSkudGhlbihmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0XHRcdGN0cmwuYWRkcmVzc0Jvb2tzLnB1c2goYWRkcmVzc0Jvb2spO1xuXHRcdFx0XHRcdCRzY29wZS4kYXBwbHkoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KS5jYXRjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0T0MuTm90aWZpY2F0aW9uLnNob3dUZW1wb3JhcnkodCgnY29udGFjdHMnLCAnQWRkcmVzcyBib29rIGNvdWxkIG5vdCBiZSBjcmVhdGVkLicpKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2FkZHJlc3Nib29rbGlzdCcsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRUEnLCAvLyBoYXMgdG8gYmUgYW4gYXR0cmlidXRlIHRvIHdvcmsgd2l0aCBjb3JlIGNzc1xuXHRcdHNjb3BlOiB7fSxcblx0XHRjb250cm9sbGVyOiAnYWRkcmVzc2Jvb2tsaXN0Q3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge30sXG5cdFx0dGVtcGxhdGVVcmw6IE9DLmxpbmtUbygnY29udGFjdHMnLCAndGVtcGxhdGVzL2FkZHJlc3NCb29rTGlzdC5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdhdmF0YXJDdHJsJywgZnVuY3Rpb24oQ29udGFjdFNlcnZpY2UpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwuaW1wb3J0ID0gQ29udGFjdFNlcnZpY2UuaW1wb3J0LmJpbmQoQ29udGFjdFNlcnZpY2UpO1xuXG5cdGN0cmwucmVtb3ZlUGhvdG8gPSBmdW5jdGlvbigpIHtcblx0XHRjdHJsLmNvbnRhY3QucmVtb3ZlUHJvcGVydHkoJ3Bob3RvJywgY3RybC5jb250YWN0LmdldFByb3BlcnR5KCdwaG90bycpKTtcblx0XHRDb250YWN0U2VydmljZS51cGRhdGUoY3RybC5jb250YWN0KTtcblx0XHQkKCdhdmF0YXInKS5yZW1vdmVDbGFzcygnbWF4aW1pemVkJyk7XG5cdH07XG5cblx0Y3RybC5kb3dubG9hZFBob3RvID0gZnVuY3Rpb24oKSB7XG5cdFx0LyogZ2xvYmFscyBBcnJheUJ1ZmZlciwgVWludDhBcnJheSAqL1xuXHRcdHZhciBpbWcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udGFjdC1hdmF0YXInKTtcblx0XHQvLyBhdG9iIHRvIGJhc2U2NF9kZWNvZGUgdGhlIGRhdGEtVVJJXG5cdFx0dmFyIGltYWdlU3BsaXQgPSBpbWcuc3JjLnNwbGl0KCcsJyk7XG5cdFx0Ly8gXCJkYXRhOmltYWdlL3BuZztiYXNlNjRcIiAtPiBcInBuZ1wiXG5cdFx0dmFyIGV4dGVuc2lvbiA9ICcuJyArIGltYWdlU3BsaXRbMF0uc3BsaXQoJzsnKVswXS5zcGxpdCgnLycpWzFdO1xuXHRcdHZhciBpbWFnZURhdGEgPSBhdG9iKGltYWdlU3BsaXRbMV0pO1xuXHRcdC8vIFVzZSB0eXBlZCBhcnJheXMgdG8gY29udmVydCB0aGUgYmluYXJ5IGRhdGEgdG8gYSBCbG9iXG5cdFx0dmFyIGFycmF5QnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKGltYWdlRGF0YS5sZW5ndGgpO1xuXHRcdHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXlCdWZmZXIpO1xuXHRcdGZvciAodmFyIGk9MDsgaTxpbWFnZURhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZpZXdbaV0gPSBpbWFnZURhdGEuY2hhckNvZGVBdChpKSAmIDB4ZmY7XG5cdFx0fVxuXHRcdHZhciBibG9iID0gbmV3IEJsb2IoW2FycmF5QnVmZmVyXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nfSk7XG5cblx0XHQvLyBVc2UgdGhlIFVSTCBvYmplY3QgdG8gY3JlYXRlIGEgdGVtcG9yYXJ5IFVSTFxuXHRcdHZhciB1cmwgPSAod2luZG93LndlYmtpdFVSTCB8fCB3aW5kb3cuVVJMKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cblx0XHR2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuXHRcdGEuc3R5bGUgPSAnZGlzcGxheTogbm9uZSc7XG5cdFx0YS5ocmVmID0gdXJsO1xuXHRcdGEuZG93bmxvYWQgPSBjdHJsLmNvbnRhY3QudWlkKCkgKyBleHRlbnNpb247XG5cdFx0YS5jbGljaygpO1xuXHRcdHdpbmRvdy5VUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG5cdFx0YS5yZW1vdmUoKTtcblx0fTtcblxuXHRjdHJsLm9wZW5QaG90byA9IGZ1bmN0aW9uKCkge1xuXHRcdCQoJ2F2YXRhcicpLnRvZ2dsZUNsYXNzKCdtYXhpbWl6ZWQnKTtcblx0fTtcblxuXHQvLyBRdWl0IGF2YXRhciBwcmV2aWV3XG5cdCQoJ2F2YXRhcicpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdCQoJ2F2YXRhcicpLnJlbW92ZUNsYXNzKCdtYXhpbWl6ZWQnKTtcblx0fSk7XG5cdCQoJ2F2YXRhciBpbWcsIGF2YXRhciAuYXZhdGFyLW9wdGlvbnMnKS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0fSk7XG5cdCQoZG9jdW1lbnQpLmtleXVwKGZ1bmN0aW9uKGUpIHtcblx0XHRpZiAoZS5rZXlDb2RlID09PSAyNykge1xuXHRcdFx0JCgnYXZhdGFyJykucmVtb3ZlQ2xhc3MoJ21heGltaXplZCcpO1xuXHRcdH1cblx0fSk7XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2F2YXRhcicsIGZ1bmN0aW9uKENvbnRhY3RTZXJ2aWNlKSB7XG5cdHJldHVybiB7XG5cdFx0c2NvcGU6IHtcblx0XHRcdGNvbnRhY3Q6ICc9ZGF0YSdcblx0XHR9LFxuXHRcdGNvbnRyb2xsZXI6ICdhdmF0YXJDdHJsJyxcblx0XHRjb250cm9sbGVyQXM6ICdjdHJsJyxcblx0XHRiaW5kVG9Db250cm9sbGVyOiB7XG5cdFx0XHRjb250YWN0OiAnPWRhdGEnXG5cdFx0fSxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuXHRcdFx0dmFyIGlucHV0ID0gZWxlbWVudC5maW5kKCdpbnB1dCcpO1xuXHRcdFx0aW5wdXQuYmluZCgnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBmaWxlID0gaW5wdXQuZ2V0KDApLmZpbGVzWzBdO1xuXHRcdFx0XHRpZiAoZmlsZS5zaXplID4gMTAyNCoxMDI0KSB7IC8vIDEgTUJcblx0XHRcdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdUaGUgc2VsZWN0ZWQgaW1hZ2UgaXMgdG9vIGJpZyAobWF4IDFNQiknKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cblx0XHRcdFx0XHRyZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0c2NvcGUuY29udGFjdC5waG90byhyZWFkZXIucmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0Q29udGFjdFNlcnZpY2UudXBkYXRlKHNjb3BlLmNvbnRhY3QpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSwgZmFsc2UpO1xuXG5cdFx0XHRcdFx0aWYgKGZpbGUpIHtcblx0XHRcdFx0XHRcdHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvYXZhdGFyLmh0bWwnKVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2NvbnRhY3RkZXRhaWxzQ3RybCcsIGZ1bmN0aW9uKENvbnRhY3RTZXJ2aWNlLCBBZGRyZXNzQm9va1NlcnZpY2UsIHZDYXJkUHJvcGVydGllc1NlcnZpY2UsICRyb3V0ZSwgJHJvdXRlUGFyYW1zLCAkc2NvcGUpIHtcblxuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC5pbml0ID0gdHJ1ZTtcblx0Y3RybC5sb2FkaW5nID0gZmFsc2U7XG5cdGN0cmwuc2hvdyA9IGZhbHNlO1xuXG5cdGN0cmwuY2xlYXJDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRnaWQ6ICRyb3V0ZVBhcmFtcy5naWQsXG5cdFx0XHR1aWQ6IHVuZGVmaW5lZFxuXHRcdH0pO1xuXHRcdGN0cmwuc2hvdyA9IGZhbHNlO1xuXHRcdGN0cmwuY29udGFjdCA9IHVuZGVmaW5lZDtcblx0fTtcblxuXHRjdHJsLnVpZCA9ICRyb3V0ZVBhcmFtcy51aWQ7XG5cdGN0cmwudCA9IHtcblx0XHRub0NvbnRhY3RzIDogdCgnY29udGFjdHMnLCAnTm8gY29udGFjdHMgaW4gaGVyZScpLFxuXHRcdHBsYWNlaG9sZGVyTmFtZSA6IHQoJ2NvbnRhY3RzJywgJ05hbWUnKSxcblx0XHRwbGFjZWhvbGRlck9yZyA6IHQoJ2NvbnRhY3RzJywgJ09yZ2FuaXphdGlvbicpLFxuXHRcdHBsYWNlaG9sZGVyVGl0bGUgOiB0KCdjb250YWN0cycsICdUaXRsZScpLFxuXHRcdHNlbGVjdEZpZWxkIDogdCgnY29udGFjdHMnLCAnQWRkIGZpZWxkIOKApicpLFxuXHRcdGRvd25sb2FkIDogdCgnY29udGFjdHMnLCAnRG93bmxvYWQnKSxcblx0XHRkZWxldGUgOiB0KCdjb250YWN0cycsICdEZWxldGUnKSxcblx0XHRzYXZlIDogdCgnY29udGFjdHMnLCAnU2F2ZSBjaGFuZ2VzJyksXG5cdFx0YWRkcmVzc0Jvb2sgOiB0KCdjb250YWN0cycsICdBZGRyZXNzIGJvb2snKSxcblx0XHRsb2FkaW5nIDogdCgnY29udGFjdHMnLCAnTG9hZGluZyBjb250YWN0cyDigKYnKVxuXHR9O1xuXG5cdGN0cmwuZmllbGREZWZpbml0aW9ucyA9IHZDYXJkUHJvcGVydGllc1NlcnZpY2UuZmllbGREZWZpbml0aW9ucztcblx0Y3RybC5mb2N1cyA9IHVuZGVmaW5lZDtcblx0Y3RybC5maWVsZCA9IHVuZGVmaW5lZDtcblx0Y3RybC5hZGRyZXNzQm9va3MgPSBbXTtcblxuXHRBZGRyZXNzQm9va1NlcnZpY2UuZ2V0QWxsKCkudGhlbihmdW5jdGlvbihhZGRyZXNzQm9va3MpIHtcblx0XHRjdHJsLmFkZHJlc3NCb29rcyA9IGFkZHJlc3NCb29rcztcblxuXHRcdGlmICghYW5ndWxhci5pc1VuZGVmaW5lZChjdHJsLmNvbnRhY3QpKSB7XG5cdFx0XHRjdHJsLmFkZHJlc3NCb29rID0gXy5maW5kKGN0cmwuYWRkcmVzc0Jvb2tzLCBmdW5jdGlvbihib29rKSB7XG5cdFx0XHRcdHJldHVybiBib29rLmRpc3BsYXlOYW1lID09PSBjdHJsLmNvbnRhY3QuYWRkcmVzc0Jvb2tJZDtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRjdHJsLmluaXQgPSBmYWxzZTtcblx0XHQvLyBTdGFydCB3YXRjaGluZyBmb3IgY3RybC51aWQgd2hlbiB3ZSBoYXZlIGFkZHJlc3NCb29rcywgYXMgdGhleSBhcmUgbmVlZGVkIGZvciBmZXRjaGluZ1xuXHRcdC8vIGZ1bGwgZGV0YWlscy5cblx0XHQkc2NvcGUuJHdhdGNoKCdjdHJsLnVpZCcsIGZ1bmN0aW9uKG5ld1ZhbHVlKSB7XG5cdFx0XHRjdHJsLmNoYW5nZUNvbnRhY3QobmV3VmFsdWUpO1xuXHRcdH0pO1xuXHR9KTtcblxuXG5cdGN0cmwuY2hhbmdlQ29udGFjdCA9IGZ1bmN0aW9uKHVpZCkge1xuXHRcdGlmICh0eXBlb2YgdWlkID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Y3RybC5zaG93ID0gZmFsc2U7XG5cdFx0XHQkKCcjYXBwLW5hdmlnYXRpb24tdG9nZ2xlJykucmVtb3ZlQ2xhc3MoJ3Nob3dkZXRhaWxzJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGN0cmwubG9hZGluZyA9IHRydWU7XG5cdFx0Q29udGFjdFNlcnZpY2UuZ2V0QnlJZChjdHJsLmFkZHJlc3NCb29rcywgdWlkKS50aGVuKGZ1bmN0aW9uKGNvbnRhY3QpIHtcblx0XHRcdGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKGNvbnRhY3QpKSB7XG5cdFx0XHRcdGN0cmwuY2xlYXJDb250YWN0KCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGN0cmwuY29udGFjdCA9IGNvbnRhY3Q7XG5cdFx0XHRjdHJsLnNob3cgPSB0cnVlO1xuXHRcdFx0Y3RybC5sb2FkaW5nID0gZmFsc2U7XG5cdFx0XHQkKCcjYXBwLW5hdmlnYXRpb24tdG9nZ2xlJykuYWRkQ2xhc3MoJ3Nob3dkZXRhaWxzJyk7XG5cblx0XHRcdGN0cmwuYWRkcmVzc0Jvb2sgPSBfLmZpbmQoY3RybC5hZGRyZXNzQm9va3MsIGZ1bmN0aW9uKGJvb2spIHtcblx0XHRcdFx0cmV0dXJuIGJvb2suZGlzcGxheU5hbWUgPT09IGN0cmwuY29udGFjdC5hZGRyZXNzQm9va0lkO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y3RybC5kZWxldGVDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0Q29udGFjdFNlcnZpY2UuZGVsZXRlKGN0cmwuYWRkcmVzc0Jvb2ssIGN0cmwuY29udGFjdCk7XG5cdH07XG5cblx0Y3RybC5hZGRGaWVsZCA9IGZ1bmN0aW9uKGZpZWxkKSB7XG5cdFx0dmFyIGRlZmF1bHRWYWx1ZSA9IHZDYXJkUHJvcGVydGllc1NlcnZpY2UuZ2V0TWV0YShmaWVsZCkuZGVmYXVsdFZhbHVlIHx8IHt2YWx1ZTogJyd9O1xuXHRcdGN0cmwuY29udGFjdC5hZGRQcm9wZXJ0eShmaWVsZCwgZGVmYXVsdFZhbHVlKTtcblx0XHRjdHJsLmZvY3VzID0gZmllbGQ7XG5cdFx0Y3RybC5maWVsZCA9ICcnO1xuXHR9O1xuXG5cdGN0cmwuZGVsZXRlRmllbGQgPSBmdW5jdGlvbiAoZmllbGQsIHByb3ApIHtcblx0XHRjdHJsLmNvbnRhY3QucmVtb3ZlUHJvcGVydHkoZmllbGQsIHByb3ApO1xuXHRcdGN0cmwuZm9jdXMgPSB1bmRlZmluZWQ7XG5cdH07XG5cblx0Y3RybC5jaGFuZ2VBZGRyZXNzQm9vayA9IGZ1bmN0aW9uIChhZGRyZXNzQm9vaywgb2xkQWRkcmVzc0Jvb2spIHtcblx0XHRDb250YWN0U2VydmljZS5tb3ZlQ29udGFjdChjdHJsLmNvbnRhY3QsIGFkZHJlc3NCb29rLCBvbGRBZGRyZXNzQm9vayk7XG5cdH07XG5cblx0Y3RybC51cGRhdGVDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0Q29udGFjdFNlcnZpY2UucXVldWVVcGRhdGUoY3RybC5jb250YWN0KTtcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2NvbnRhY3RkZXRhaWxzJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cHJpb3JpdHk6IDEsXG5cdFx0c2NvcGU6IHt9LFxuXHRcdGNvbnRyb2xsZXI6ICdjb250YWN0ZGV0YWlsc0N0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHt9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9jb250YWN0RGV0YWlscy5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdjb250YWN0Q3RybCcsIGZ1bmN0aW9uKCRyb3V0ZSwgJHJvdXRlUGFyYW1zLCBTb3J0QnlTZXJ2aWNlKSB7XG5cdHZhciBjdHJsID0gdGhpcztcblxuXHRjdHJsLnQgPSB7XG5cdFx0ZXJyb3JNZXNzYWdlIDogdCgnY29udGFjdHMnLCAnVGhpcyBjYXJkIGlzIGNvcnJ1cHRlZCBhbmQgaGFzIGJlZW4gZml4ZWQuIFBsZWFzZSBjaGVjayB0aGUgZGF0YSBhbmQgdHJpZ2dlciBhIHNhdmUgdG8gbWFrZSB0aGUgY2hhbmdlcyBwZXJtYW5lbnQuJyksXG5cdH07XG5cblx0Y3RybC5nZXROYW1lID0gZnVuY3Rpb24oKSB7XG5cdFx0Ly8gSWYgbGFzdE5hbWUgZXF1YWxzIHRvIGZpcnN0TmFtZSB0aGVuIG5vbmUgb2YgdGhlbSBpcyBzZXRcblx0XHRpZiAoY3RybC5jb250YWN0Lmxhc3ROYW1lKCkgPT09IGN0cmwuY29udGFjdC5maXJzdE5hbWUoKSkge1xuXHRcdFx0cmV0dXJuIGN0cmwuY29udGFjdC5kaXNwbGF5TmFtZSgpO1xuXHRcdH1cblxuXHRcdGlmIChTb3J0QnlTZXJ2aWNlLmdldFNvcnRCeUtleSgpID09PSAnc29ydExhc3ROYW1lJykge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0Y3RybC5jb250YWN0Lmxhc3ROYW1lKClcblx0XHRcdFx0KyAoY3RybC5jb250YWN0LmZpcnN0TmFtZSgpID8gJywgJyA6ICcnKVxuXHRcdFx0XHQrIGN0cmwuY29udGFjdC5maXJzdE5hbWUoKSArICcgJ1xuXHRcdFx0XHQrIGN0cmwuY29udGFjdC5hZGRpdGlvbmFsTmFtZXMoKVxuXHRcdFx0KS50cmltKCk7XG5cdFx0fVxuXG5cdFx0aWYgKFNvcnRCeVNlcnZpY2UuZ2V0U29ydEJ5S2V5KCkgPT09ICdzb3J0Rmlyc3ROYW1lJykge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0Y3RybC5jb250YWN0LmZpcnN0TmFtZSgpICsgJyAnXG5cdFx0XHRcdCsgY3RybC5jb250YWN0LmFkZGl0aW9uYWxOYW1lcygpICsgJyAnXG5cdFx0XHRcdCsgY3RybC5jb250YWN0Lmxhc3ROYW1lKClcblx0XHRcdCkudHJpbSgpO1xuXHRcdH1cblxuXHRcdHJldHVybiBjdHJsLmNvbnRhY3QuZGlzcGxheU5hbWUoKTtcblx0fTtcbn0pO1xuXG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgnY29udGFjdCcsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHNjb3BlOiB7fSxcblx0XHRjb250cm9sbGVyOiAnY29udGFjdEN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcblx0XHRcdGNvbnRhY3Q6ICc9ZGF0YSdcblx0XHR9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9jb250YWN0Lmh0bWwnKVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2NvbnRhY3RmaWx0ZXJDdHJsJywgZnVuY3Rpb24oKSB7XG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWQtdmFyc1xuXHR2YXIgY3RybCA9IHRoaXM7XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdjb250YWN0RmlsdGVyJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdBJywgLy8gaGFzIHRvIGJlIGFuIGF0dHJpYnV0ZSB0byB3b3JrIHdpdGggY29yZSBjc3Ncblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2NvbnRhY3RmaWx0ZXJDdHJsJyxcblx0XHRjb250cm9sbGVyQXM6ICdjdHJsJyxcblx0XHRiaW5kVG9Db250cm9sbGVyOiB7XG5cdFx0XHRjb250YWN0RmlsdGVyOiAnPWNvbnRhY3RGaWx0ZXInXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvY29udGFjdEZpbHRlci5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdjb250YWN0aW1wb3J0Q3RybCcsIGZ1bmN0aW9uKENvbnRhY3RTZXJ2aWNlLCBBZGRyZXNzQm9va1NlcnZpY2UsICR0aW1lb3V0LCAkc2NvcGUpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwudCA9IHtcblx0XHRpbXBvcnRUZXh0IDogdCgnY29udGFjdHMnLCAnSW1wb3J0IGludG8nKSxcblx0XHRpbXBvcnRpbmdUZXh0IDogdCgnY29udGFjdHMnLCAnSW1wb3J0aW5nLi4uJyksXG5cdFx0c2VsZWN0QWRkcmVzc2Jvb2sgOiB0KCdjb250YWN0cycsICdTZWxlY3QgeW91ciBhZGRyZXNzYm9vaycpLFxuXHRcdGltcG9ydGRpc2FibGVkIDogdCgnY29udGFjdHMnLCAnSW1wb3J0IGlzIGRpc2FibGVkIGJlY2F1c2Ugbm8gd3JpdGFibGUgYWRkcmVzcyBib29rIGhhZCBiZWVuIGZvdW5kLicpXG5cdH07XG5cblx0Y3RybC5pbXBvcnQgPSBDb250YWN0U2VydmljZS5pbXBvcnQuYmluZChDb250YWN0U2VydmljZSk7XG5cdGN0cmwubG9hZGluZyA9IHRydWU7XG5cdGN0cmwuaW1wb3J0VGV4dCA9IGN0cmwudC5pbXBvcnRUZXh0O1xuXHRjdHJsLmltcG9ydGluZyA9IGZhbHNlO1xuXHRjdHJsLmxvYWRpbmdDbGFzcyA9ICdpY29uLXVwbG9hZCc7XG5cblx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmdldEFsbCgpLnRoZW4oZnVuY3Rpb24oYWRkcmVzc0Jvb2tzKSB7XG5cdFx0Y3RybC5hZGRyZXNzQm9va3MgPSBhZGRyZXNzQm9va3M7XG5cdFx0Y3RybC5sb2FkaW5nID0gZmFsc2U7XG5cdFx0Y3RybC5zZWxlY3RlZEFkZHJlc3NCb29rID0gQWRkcmVzc0Jvb2tTZXJ2aWNlLmdldERlZmF1bHRBZGRyZXNzQm9vaygpO1xuXHR9KTtcblxuXHRBZGRyZXNzQm9va1NlcnZpY2UucmVnaXN0ZXJPYnNlcnZlckNhbGxiYWNrKGZ1bmN0aW9uKCkge1xuXHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0JHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcblx0XHRcdFx0Y3RybC5zZWxlY3RlZEFkZHJlc3NCb29rID0gQWRkcmVzc0Jvb2tTZXJ2aWNlLmdldERlZmF1bHRBZGRyZXNzQm9vaygpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdGN0cmwuc3RvcEhpZGVNZW51ID0gZnVuY3Rpb24oaXNPcGVuKSB7XG5cdFx0aWYoaXNPcGVuKSB7XG5cdFx0XHQvLyBkaXNhYmxpbmcgc2V0dGluZ3MgYmluZFxuXHRcdFx0JCgnI2FwcC1zZXR0aW5ncy1oZWFkZXIgPiBidXR0b24nKS5kYXRhKCdhcHBzLXNsaWRlLXRvZ2dsZScsIGZhbHNlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gcmVlbmFibGluZyBpdFxuXHRcdFx0JCgnI2FwcC1zZXR0aW5ncy1oZWFkZXIgPiBidXR0b24nKS5kYXRhKCdhcHBzLXNsaWRlLXRvZ2dsZScsICcjYXBwLXNldHRpbmdzLWNvbnRlbnQnKTtcblx0XHR9XG5cdH07XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2NvbnRhY3RpbXBvcnQnLCBmdW5jdGlvbihDb250YWN0U2VydmljZSwgSW1wb3J0U2VydmljZSwgJHJvb3RTY29wZSkge1xuXHRyZXR1cm4ge1xuXHRcdGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RybCkge1xuXHRcdFx0dmFyIGlucHV0ID0gZWxlbWVudC5maW5kKCdpbnB1dCcpO1xuXHRcdFx0aW5wdXQuYmluZCgnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGFuZ3VsYXIuZm9yRWFjaChpbnB1dC5nZXQoMCkuZmlsZXMsIGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuXHRcdFx0XHRcdHJlYWRlci5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0c2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0Ly8gSW5kaWNhdGUgdGhlIHVzZXIgd2Ugc3RhcnRlZCBzb21ldGhpbmdcblx0XHRcdFx0XHRcdFx0Y3RybC5pbXBvcnRUZXh0ID0gY3RybC50LmltcG9ydGluZ1RleHQ7XG5cdFx0XHRcdFx0XHRcdGN0cmwubG9hZGluZ0NsYXNzID0gJ2ljb24tbG9hZGluZy1zbWFsbCc7XG5cdFx0XHRcdFx0XHRcdGN0cmwuaW1wb3J0aW5nID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0JHJvb3RTY29wZS5pbXBvcnRpbmcgPSB0cnVlO1xuXG5cdFx0XHRcdFx0XHRcdENvbnRhY3RTZXJ2aWNlLmltcG9ydC5jYWxsKENvbnRhY3RTZXJ2aWNlLCByZWFkZXIucmVzdWx0LCBmaWxlLnR5cGUsIGN0cmwuc2VsZWN0ZWRBZGRyZXNzQm9vaywgZnVuY3Rpb24gKHByb2dyZXNzLCB1c2VyKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHByb2dyZXNzID09PSAxKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjdHJsLmltcG9ydFRleHQgPSBjdHJsLnQuaW1wb3J0VGV4dDtcblx0XHRcdFx0XHRcdFx0XHRcdGN0cmwubG9hZGluZ0NsYXNzID0gJ2ljb24tdXBsb2FkJztcblx0XHRcdFx0XHRcdFx0XHRcdGN0cmwuaW1wb3J0aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0XHQkcm9vdFNjb3BlLmltcG9ydGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5pbXBvcnRQZXJjZW50ID0gMDtcblx0XHRcdFx0XHRcdFx0XHRcdEltcG9ydFNlcnZpY2UuaW1wb3J0aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0XHRJbXBvcnRTZXJ2aWNlLmltcG9ydGVkVXNlciA9ICcnO1xuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5zZWxlY3RlZEFkZHJlc3NCb29rID0gJyc7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdC8vIFVnbHkgaGFjaywgaGlkZSBzaWRlYmFyIG9uIGltcG9ydCAmIG1vYmlsZVxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gU2ltdWxhdGUgY2xpY2sgc2luY2Ugd2UgY2FuJ3QgZGlyZWN0bHkgYWNjZXNzIHNuYXBwZXJcblx0XHRcdFx0XHRcdFx0XHRcdGlmKCQod2luZG93KS53aWR0aCgpIDw9IDc2OCAmJiAkKCdib2R5JykuaGFzQ2xhc3MoJ3NuYXBqcy1sZWZ0JykpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCgnI2FwcC1uYXZpZ2F0aW9uLXRvZ2dsZScpLmNsaWNrKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoJ2JvZHknKS5yZW1vdmVDbGFzcygnc25hcGpzLWxlZnQnKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5pbXBvcnRQZXJjZW50ID0gcGFyc2VJbnQoTWF0aC5mbG9vcihwcm9ncmVzcyAqIDEwMCkpO1xuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5pbXBvcnRpbmcgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5pbXBvcnRlZFVzZXIgPSB1c2VyO1xuXHRcdFx0XHRcdFx0XHRcdFx0SW1wb3J0U2VydmljZS5zZWxlY3RlZEFkZHJlc3NCb29rID0gY3RybC5zZWxlY3RlZEFkZHJlc3NCb29rLmRpc3BsYXlOYW1lO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRzY29wZS4kYXBwbHkoKTtcblxuXHRcdFx0XHRcdFx0XHRcdC8qIEJyb2FkY2FzdCBzZXJ2aWNlIHVwZGF0ZSAqL1xuXHRcdFx0XHRcdFx0XHRcdCRyb290U2NvcGUuJGJyb2FkY2FzdCgnaW1wb3J0aW5nJywgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSwgZmFsc2UpO1xuXG5cdFx0XHRcdFx0aWYgKGZpbGUpIHtcblx0XHRcdFx0XHRcdHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdGlucHV0LmdldCgwKS52YWx1ZSA9ICcnO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvY29udGFjdEltcG9ydC5odG1sJyksXG5cdFx0Y29udHJvbGxlcjogJ2NvbnRhY3RpbXBvcnRDdHJsJyxcblx0XHRjb250cm9sbGVyQXM6ICdjdHJsJ1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ2NvbnRhY3RsaXN0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJGZpbHRlciwgJHJvdXRlLCAkcm91dGVQYXJhbXMsICR0aW1lb3V0LCBBZGRyZXNzQm9va1NlcnZpY2UsIENvbnRhY3RTZXJ2aWNlLCBTb3J0QnlTZXJ2aWNlLCB2Q2FyZFByb3BlcnRpZXNTZXJ2aWNlLCBTZWFyY2hTZXJ2aWNlKSB7XG5cdHZhciBjdHJsID0gdGhpcztcblxuXHRjdHJsLnJvdXRlUGFyYW1zID0gJHJvdXRlUGFyYW1zO1xuXG5cdGN0cmwuZmlsdGVyZWRDb250YWN0cyA9IFtdOyAvLyB0aGUgZGlzcGxheWVkIGNvbnRhY3RzIGxpc3Rcblx0Y3RybC5zZWFyY2hUZXJtID0gJyc7XG5cdGN0cmwuc2hvdyA9IHRydWU7XG5cdGN0cmwuaW52YWxpZCA9IGZhbHNlO1xuXHRjdHJsLmxpbWl0VG8gPSAyNTtcblxuXHRjdHJsLnNvcnRCeSA9IFNvcnRCeVNlcnZpY2UuZ2V0U29ydEJ5KCk7XG5cblx0Y3RybC50ID0ge1xuXHRcdGVtcHR5U2VhcmNoIDogdCgnY29udGFjdHMnLCAnTm8gc2VhcmNoIHJlc3VsdCBmb3Ige3F1ZXJ5fScsIHtxdWVyeTogY3RybC5zZWFyY2hUZXJtfSlcblx0fTtcblxuXHRjdHJsLnJlc2V0TGltaXRUbyA9IGZ1bmN0aW9uICgpIHtcblx0XHRjdHJsLmxpbWl0VG8gPSAyNTtcblx0XHRjbGVhckludGVydmFsKGN0cmwuaW50ZXJ2YWxJZCk7XG5cdFx0Y3RybC5pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwoXG5cdFx0XHRmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmICghY3RybC5sb2FkaW5nICYmIGN0cmwuY29udGFjdExpc3QgJiYgY3RybC5jb250YWN0TGlzdC5sZW5ndGggPiBjdHJsLmxpbWl0VG8pIHtcblx0XHRcdFx0XHRjdHJsLmxpbWl0VG8gKz0gMjU7XG5cdFx0XHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LCAzMDApO1xuXHR9O1xuXG5cdCRzY29wZS5xdWVyeSA9IGZ1bmN0aW9uKGNvbnRhY3QpIHtcblx0XHRyZXR1cm4gY29udGFjdC5tYXRjaGVzKFNlYXJjaFNlcnZpY2UuZ2V0U2VhcmNoVGVybSgpKTtcblx0fTtcblxuXHRTb3J0QnlTZXJ2aWNlLnN1YnNjcmliZShmdW5jdGlvbihuZXdWYWx1ZSkge1xuXHRcdGN0cmwuc29ydEJ5ID0gbmV3VmFsdWU7XG5cdH0pO1xuXG5cdFNlYXJjaFNlcnZpY2UucmVnaXN0ZXJPYnNlcnZlckNhbGxiYWNrKGZ1bmN0aW9uKGV2KSB7XG5cdFx0aWYgKGV2LmV2ZW50ID09PSAnc3VibWl0U2VhcmNoJykge1xuXHRcdFx0dmFyIHVpZCA9ICFfLmlzRW1wdHkoY3RybC5maWx0ZXJlZENvbnRhY3RzKSA/IGN0cmwuZmlsdGVyZWRDb250YWN0c1swXS51aWQoKSA6IHVuZGVmaW5lZDtcblx0XHRcdGN0cmwuc2V0U2VsZWN0ZWRJZCh1aWQpO1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH1cblx0XHRpZiAoZXYuZXZlbnQgPT09ICdjaGFuZ2VTZWFyY2gnKSB7XG5cdFx0XHRjdHJsLnJlc2V0TGltaXRUbygpO1xuXHRcdFx0Y3RybC5zZWFyY2hUZXJtID0gZXYuc2VhcmNoVGVybTtcblx0XHRcdGN0cmwudC5lbXB0eVNlYXJjaCA9IHQoJ2NvbnRhY3RzJyxcblx0XHRcdFx0XHRcdFx0XHQgICAnTm8gc2VhcmNoIHJlc3VsdCBmb3Ige3F1ZXJ5fScsXG5cdFx0XHRcdFx0XHRcdFx0ICAge3F1ZXJ5OiBjdHJsLnNlYXJjaFRlcm19XG5cdFx0XHRcdFx0XHRcdFx0ICApO1xuXHRcdFx0JHNjb3BlLiRhcHBseSgpO1xuXHRcdH1cblx0fSk7XG5cblx0Y3RybC5sb2FkaW5nID0gdHJ1ZTtcblxuXHRDb250YWN0U2VydmljZS5yZWdpc3Rlck9ic2VydmVyQ2FsbGJhY2soZnVuY3Rpb24oZXYpIHtcblx0XHQvKiBhZnRlciBpbXBvcnQgYXQgZmlyc3QgcmVmcmVzaCB0aGUgY29udGFjdExpc3QgKi9cblx0XHRpZiAoZXYuZXZlbnQgPT09ICdpbXBvcnRlbmQnKSB7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjdHJsLmNvbnRhY3RMaXN0ID0gZXYuY29udGFjdHM7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0LyogdXBkYXRlIHJvdXRlIHBhcmFtZXRlcnMgKi9cblx0XHQkdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdCRzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHN3aXRjaChldi5ldmVudCkge1xuXHRcdFx0XHRjYXNlICdkZWxldGUnOlxuXHRcdFx0XHRcdGN0cmwuc2VsZWN0TmVhcmVzdENvbnRhY3QoZXYudWlkKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAnY3JlYXRlJzpcblx0XHRcdFx0XHQkcm91dGUudXBkYXRlUGFyYW1zKHtcblx0XHRcdFx0XHRcdGdpZDogJHJvdXRlUGFyYW1zLmdpZCxcblx0XHRcdFx0XHRcdHVpZDogZXYudWlkXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2ltcG9ydGVuZCc6XG5cdFx0XHRcdFx0LyogYWZ0ZXIgaW1wb3J0IHNlbGVjdCAnQWxsIGNvbnRhY3RzJyBncm91cCBhbmQgZmlyc3QgY29udGFjdCAqL1xuXHRcdFx0XHRcdCRyb3V0ZS51cGRhdGVQYXJhbXMoe1xuXHRcdFx0XHRcdFx0Z2lkOiB0KCdjb250YWN0cycsICdBbGwgY29udGFjdHMnKSxcblx0XHRcdFx0XHRcdHVpZDogY3RybC5maWx0ZXJlZENvbnRhY3RzLmxlbmd0aCAhPT0gMCA/IGN0cmwuZmlsdGVyZWRDb250YWN0c1swXS51aWQoKSA6IHVuZGVmaW5lZFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0Y2FzZSAnZ2V0RnVsbENvbnRhY3RzJyB8fCAndXBkYXRlJzpcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHQvLyB1bmtub3duIGV2ZW50IC0+IGxlYXZlIGNhbGxiYWNrIHdpdGhvdXQgYWN0aW9uXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN0cmwuY29udGFjdExpc3QgPSBldi5jb250YWN0cztcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9KTtcblxuXHRBZGRyZXNzQm9va1NlcnZpY2UucmVnaXN0ZXJPYnNlcnZlckNhbGxiYWNrKGZ1bmN0aW9uKGV2KSB7XG5cdFx0JHRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHQkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzd2l0Y2ggKGV2LmV2ZW50KSB7XG5cdFx0XHRcdGNhc2UgJ2RlbGV0ZSc6XG5cdFx0XHRcdGNhc2UgJ2Rpc2FibGUnOlxuXHRcdFx0XHRcdGN0cmwubG9hZGluZyA9IHRydWU7XG5cdFx0XHRcdFx0Q29udGFjdFNlcnZpY2UucmVtb3ZlQ29udGFjdHNGcm9tQWRkcmVzc2Jvb2soZXYuYWRkcmVzc0Jvb2ssIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0Q29udGFjdFNlcnZpY2UuZ2V0QWxsKCkudGhlbihmdW5jdGlvbihjb250YWN0cykge1xuXHRcdFx0XHRcdFx0XHRjdHJsLmNvbnRhY3RMaXN0ID0gY29udGFjdHM7XG5cdFx0XHRcdFx0XHRcdGN0cmwubG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHQvLyBPbmx5IGNoYW5nZSBjb250YWN0IGlmIHRoZSBzZWxlY3RkIG9uZSBpcyBub3QgaW4gdGhlIGxpc3QgYW55bW9yZVxuXHRcdFx0XHRcdFx0XHRpZihjdHJsLmNvbnRhY3RMaXN0LmZpbmRJbmRleChmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGNvbnRhY3QudWlkKCkgPT09IGN0cmwuZ2V0U2VsZWN0ZWRJZCgpO1xuXHRcdFx0XHRcdFx0XHR9KSA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdFx0XHRjdHJsLnNlbGVjdE5lYXJlc3RDb250YWN0KGN0cmwuZ2V0U2VsZWN0ZWRJZCgpKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2VuYWJsZSc6XG5cdFx0XHRcdFx0Y3RybC5sb2FkaW5nID0gdHJ1ZTtcblx0XHRcdFx0XHRDb250YWN0U2VydmljZS5hcHBlbmRDb250YWN0c0Zyb21BZGRyZXNzYm9vayhldi5hZGRyZXNzQm9vaywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRDb250YWN0U2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGNvbnRhY3RzKSB7XG5cdFx0XHRcdFx0XHRcdGN0cmwuY29udGFjdExpc3QgPSBjb250YWN0cztcblx0XHRcdFx0XHRcdFx0Y3RybC5sb2FkaW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdC8vIHVua25vd24gZXZlbnQgLT4gbGVhdmUgY2FsbGJhY2sgd2l0aG91dCBhY3Rpb25cblx0XHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8vIEdldCBjb250YWN0c1xuXHRDb250YWN0U2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGNvbnRhY3RzKSB7XG5cdFx0aWYoY29udGFjdHMubGVuZ3RoPjApIHtcblx0XHRcdCRzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGN0cmwuY29udGFjdExpc3QgPSBjb250YWN0cztcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdHJsLmxvYWRpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xuXG5cdHZhciBnZXRWaXNpYmxlQ29udGFjdHMgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2Nyb2xsZWQgPSAkKCcuYXBwLWNvbnRlbnQtbGlzdCcpLnNjcm9sbFRvcCgpO1xuXHRcdHZhciBlbEhlaWdodCA9ICQoJy5jb250YWN0cy1saXN0JykuY2hpbGRyZW4oKS5vdXRlckhlaWdodCh0cnVlKTtcblx0XHR2YXIgbGlzdEhlaWdodCA9ICQoJy5hcHAtY29udGVudC1saXN0JykuaGVpZ2h0KCk7XG5cblx0XHR2YXIgdG9wQ29udGFjdCA9IE1hdGgucm91bmQoc2Nyb2xsZWQvZWxIZWlnaHQpO1xuXHRcdHZhciBjb250YWN0c0NvdW50ID0gTWF0aC5yb3VuZChsaXN0SGVpZ2h0L2VsSGVpZ2h0KTtcblxuXHRcdHJldHVybiBjdHJsLmZpbHRlcmVkQ29udGFjdHMuc2xpY2UodG9wQ29udGFjdC0xLCB0b3BDb250YWN0K2NvbnRhY3RzQ291bnQrMSk7XG5cdH07XG5cblx0dmFyIHRpbWVvdXRJZCA9IG51bGw7XG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcHAtY29udGVudC1saXN0JykuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgZnVuY3Rpb24gKCkge1xuXHRcdGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuXHRcdHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIGNvbnRhY3RzID0gZ2V0VmlzaWJsZUNvbnRhY3RzKCk7XG5cdFx0XHRDb250YWN0U2VydmljZS5nZXRGdWxsQ29udGFjdHMoY29udGFjdHMpO1xuXHRcdH0sIDI1MCk7XG5cdH0pO1xuXG5cdC8vIFdhaXQgZm9yIGN0cmwuZmlsdGVyZWRDb250YWN0cyB0byBiZSB1cGRhdGVkLCBsb2FkIHRoZSBjb250YWN0IHJlcXVlc3RlZCBpbiB0aGUgVVJMIGlmIGFueSwgYW5kXG5cdC8vIGxvYWQgZnVsbCBkZXRhaWxzIGZvciB0aGUgcHJvYmFibHkgaW5pdGlhbGx5IHZpc2libGUgY29udGFjdHMuXG5cdC8vIFRoZW4ga2lsbCB0aGUgd2F0Y2guXG5cdHZhciB1bmJpbmRMaXN0V2F0Y2ggPSAkc2NvcGUuJHdhdGNoKCdjdHJsLmZpbHRlcmVkQ29udGFjdHMnLCBmdW5jdGlvbigpIHtcblx0XHRpZihjdHJsLmZpbHRlcmVkQ29udGFjdHMgJiYgY3RybC5maWx0ZXJlZENvbnRhY3RzLmxlbmd0aCA+IDApIHtcblx0XHRcdC8vIENoZWNrIGlmIGEgc3BlY2lmaWMgdWlkIGlzIHJlcXVlc3RlZFxuXHRcdFx0aWYoJHJvdXRlUGFyYW1zLnVpZCAmJiAkcm91dGVQYXJhbXMuZ2lkKSB7XG5cdFx0XHRcdGN0cmwuZmlsdGVyZWRDb250YWN0cy5mb3JFYWNoKGZ1bmN0aW9uKGNvbnRhY3QpIHtcblx0XHRcdFx0XHRpZihjb250YWN0LnVpZCgpID09PSAkcm91dGVQYXJhbXMudWlkKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNldFNlbGVjdGVkSWQoJHJvdXRlUGFyYW1zLnVpZCk7XG5cdFx0XHRcdFx0XHRjdHJsLmxvYWRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gTm8gY29udGFjdCBwcmV2aW91c2x5IGxvYWRlZCwgbGV0J3MgbG9hZCB0aGUgZmlyc3Qgb2YgdGhlIGxpc3QgaWYgbm90IGluIG1vYmlsZSBtb2RlXG5cdFx0XHRpZihjdHJsLmxvYWRpbmcgJiYgJCh3aW5kb3cpLndpZHRoKCkgPiA3NjgpIHtcblx0XHRcdFx0Y3RybC5zZXRTZWxlY3RlZElkKGN0cmwuZmlsdGVyZWRDb250YWN0c1swXS51aWQoKSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBHZXQgZnVsbCBkYXRhIGZvciB0aGUgZmlyc3QgMjAgY29udGFjdHMgb2YgdGhlIGxpc3Rcblx0XHRcdENvbnRhY3RTZXJ2aWNlLmdldEZ1bGxDb250YWN0cyhjdHJsLmZpbHRlcmVkQ29udGFjdHMuc2xpY2UoMCwgMjApKTtcblx0XHRcdGN0cmwubG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0dW5iaW5kTGlzdFdhdGNoKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkc2NvcGUuJHdhdGNoKCdjdHJsLnJvdXRlUGFyYW1zLnVpZCcsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuXHRcdC8vIFVzZWQgZm9yIG1vYmlsZSB2aWV3IHRvIGNsZWFyIHRoZSB1cmxcblx0XHRpZih0eXBlb2Ygb2xkVmFsdWUgIT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIG5ld1ZhbHVlID09ICd1bmRlZmluZWQnICYmICQod2luZG93KS53aWR0aCgpIDw9IDc2OCkge1xuXHRcdFx0Ly8gbm8gY29udGFjdCBzZWxlY3RlZFxuXHRcdFx0Y3RybC5zaG93ID0gdHJ1ZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYobmV3VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0Ly8gd2UgbWlnaHQgaGF2ZSB0byB3YWl0IHVudGlsIG5nLXJlcGVhdCBmaWxsZWQgdGhlIGNvbnRhY3RMaXN0XG5cdFx0XHRpZihjdHJsLmZpbHRlcmVkQ29udGFjdHMgJiYgY3RybC5maWx0ZXJlZENvbnRhY3RzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdFx0Z2lkOiAkcm91dGVQYXJhbXMuZ2lkLFxuXHRcdFx0XHRcdHVpZDogY3RybC5maWx0ZXJlZENvbnRhY3RzWzBdLnVpZCgpXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gd2F0Y2ggZm9yIG5leHQgY29udGFjdExpc3QgdXBkYXRlXG5cdFx0XHRcdHZhciB1bmJpbmRXYXRjaCA9ICRzY29wZS4kd2F0Y2goJ2N0cmwuZmlsdGVyZWRDb250YWN0cycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmKGN0cmwuZmlsdGVyZWRDb250YWN0cyAmJiBjdHJsLmZpbHRlcmVkQ29udGFjdHMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdFx0XHRcdGdpZDogJHJvdXRlUGFyYW1zLmdpZCxcblx0XHRcdFx0XHRcdFx0dWlkOiBjdHJsLmZpbHRlcmVkQ29udGFjdHNbMF0udWlkKClcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR1bmJpbmRXYXRjaCgpOyAvLyB1bmJpbmQgYXMgd2Ugb25seSB3YW50IG9uZSB1cGRhdGVcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGRpc3BsYXlpbmcgY29udGFjdCBkZXRhaWxzXG5cdFx0XHRjdHJsLnNob3cgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xuXG5cdCRzY29wZS4kd2F0Y2goJ2N0cmwucm91dGVQYXJhbXMuZ2lkJywgZnVuY3Rpb24oKSB7XG5cdFx0Ly8gd2UgbWlnaHQgaGF2ZSB0byB3YWl0IHVudGlsIG5nLXJlcGVhdCBmaWxsZWQgdGhlIGNvbnRhY3RMaXN0XG5cdFx0Y3RybC5maWx0ZXJlZENvbnRhY3RzID0gW107XG5cdFx0Y3RybC5yZXNldExpbWl0VG8oKTtcblx0XHQvLyBub3QgaW4gbW9iaWxlIG1vZGVcblx0XHRpZigkKHdpbmRvdykud2lkdGgoKSA+IDc2OCkge1xuXHRcdFx0Ly8gd2F0Y2ggZm9yIG5leHQgY29udGFjdExpc3QgdXBkYXRlXG5cdFx0XHR2YXIgdW5iaW5kV2F0Y2ggPSAkc2NvcGUuJHdhdGNoKCdjdHJsLmZpbHRlcmVkQ29udGFjdHMnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYoY3RybC5maWx0ZXJlZENvbnRhY3RzICYmIGN0cmwuZmlsdGVyZWRDb250YWN0cy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdFx0XHRnaWQ6ICRyb3V0ZVBhcmFtcy5naWQsXG5cdFx0XHRcdFx0XHR1aWQ6ICRyb3V0ZVBhcmFtcy51aWQgfHwgY3RybC5maWx0ZXJlZENvbnRhY3RzWzBdLnVpZCgpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dW5iaW5kV2F0Y2goKTsgLy8gdW5iaW5kIGFzIHdlIG9ubHkgd2FudCBvbmUgdXBkYXRlXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIFdhdGNoIGlmIHdlIGhhdmUgYW4gaW52YWxpZCBjb250YWN0XG5cdCRzY29wZS4kd2F0Y2goJ2N0cmwuZmlsdGVyZWRDb250YWN0c1swXS5kaXNwbGF5TmFtZSgpJywgZnVuY3Rpb24oZGlzcGxheU5hbWUpIHtcblx0XHRjdHJsLmludmFsaWQgPSAoZGlzcGxheU5hbWUgPT09ICcnKTtcblx0fSk7XG5cblx0Y3RybC5oYXNDb250YWN0cyA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIWN0cmwuY29udGFjdExpc3QpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIGN0cmwuY29udGFjdExpc3QubGVuZ3RoID4gMDtcblx0fTtcblxuXHRjdHJsLnNldFNlbGVjdGVkSWQgPSBmdW5jdGlvbiAoY29udGFjdElkKSB7XG5cdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHR1aWQ6IGNvbnRhY3RJZFxuXHRcdH0pO1xuXHR9O1xuXG5cdGN0cmwuZ2V0U2VsZWN0ZWRJZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAkcm91dGVQYXJhbXMudWlkO1xuXHR9O1xuXG5cdGN0cmwuc2VsZWN0TmVhcmVzdENvbnRhY3QgPSBmdW5jdGlvbihjb250YWN0SWQpIHtcblx0XHRpZiAoY3RybC5maWx0ZXJlZENvbnRhY3RzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdGdpZDogJHJvdXRlUGFyYW1zLmdpZCxcblx0XHRcdFx0dWlkOiB1bmRlZmluZWRcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gY3RybC5maWx0ZXJlZENvbnRhY3RzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdC8vIEdldCBuZWFyZXN0IGNvbnRhY3Rcblx0XHRcdFx0aWYgKGN0cmwuZmlsdGVyZWRDb250YWN0c1tpXS51aWQoKSA9PT0gY29udGFjdElkKSB7XG5cdFx0XHRcdFx0JHJvdXRlLnVwZGF0ZVBhcmFtcyh7XG5cdFx0XHRcdFx0XHRnaWQ6ICRyb3V0ZVBhcmFtcy5naWQsXG5cdFx0XHRcdFx0XHR1aWQ6IChjdHJsLmZpbHRlcmVkQ29udGFjdHNbaSsxXSkgPyBjdHJsLmZpbHRlcmVkQ29udGFjdHNbaSsxXS51aWQoKSA6IGN0cmwuZmlsdGVyZWRDb250YWN0c1tpLTFdLnVpZCgpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH07XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2NvbnRhY3RsaXN0JywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cHJpb3JpdHk6IDEsXG5cdFx0c2NvcGU6IHt9LFxuXHRcdGNvbnRyb2xsZXI6ICdjb250YWN0bGlzdEN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcblx0XHRcdGFkZHJlc3Nib29rOiAnPWFkcmJvb2snXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvY29udGFjdExpc3QuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignZGV0YWlsc0l0ZW1DdHJsJywgZnVuY3Rpb24oJHRlbXBsYXRlUmVxdWVzdCwgJGZpbHRlciwgdkNhcmRQcm9wZXJ0aWVzU2VydmljZSwgQ29udGFjdFNlcnZpY2UpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwubWV0YSA9IHZDYXJkUHJvcGVydGllc1NlcnZpY2UuZ2V0TWV0YShjdHJsLm5hbWUpO1xuXHRjdHJsLnR5cGUgPSB1bmRlZmluZWQ7XG5cdGN0cmwuaXNQcmVmZXJyZWQgPSBmYWxzZTtcblx0Y3RybC50ID0ge1xuXHRcdHBvQm94IDogdCgnY29udGFjdHMnLCAnUG9zdCBvZmZpY2UgYm94JyksXG5cdFx0cG9zdGFsQ29kZSA6IHQoJ2NvbnRhY3RzJywgJ1Bvc3RhbCBjb2RlJyksXG5cdFx0Y2l0eSA6IHQoJ2NvbnRhY3RzJywgJ0NpdHknKSxcblx0XHRzdGF0ZSA6IHQoJ2NvbnRhY3RzJywgJ1N0YXRlIG9yIHByb3ZpbmNlJyksXG5cdFx0Y291bnRyeSA6IHQoJ2NvbnRhY3RzJywgJ0NvdW50cnknKSxcblx0XHRhZGRyZXNzOiB0KCdjb250YWN0cycsICdBZGRyZXNzJyksXG5cdFx0bmV3R3JvdXA6IHQoJ2NvbnRhY3RzJywgJyhuZXcgZ3JvdXApJyksXG5cdFx0ZmFtaWx5TmFtZTogdCgnY29udGFjdHMnLCAnTGFzdCBuYW1lJyksXG5cdFx0Zmlyc3ROYW1lOiB0KCdjb250YWN0cycsICdGaXJzdCBuYW1lJyksXG5cdFx0YWRkaXRpb25hbE5hbWVzOiB0KCdjb250YWN0cycsICdBZGRpdGlvbmFsIG5hbWVzJyksXG5cdFx0aG9ub3JpZmljUHJlZml4OiB0KCdjb250YWN0cycsICdQcmVmaXgnKSxcblx0XHRob25vcmlmaWNTdWZmaXg6IHQoJ2NvbnRhY3RzJywgJ1N1ZmZpeCcpLFxuXHRcdGRlbGV0ZTogdCgnY29udGFjdHMnLCAnRGVsZXRlJylcblx0fTtcblxuXHRjdHJsLmF2YWlsYWJsZU9wdGlvbnMgPSBjdHJsLm1ldGEub3B0aW9ucyB8fCBbXTtcblx0aWYgKCFfLmlzVW5kZWZpbmVkKGN0cmwuZGF0YSkgJiYgIV8uaXNVbmRlZmluZWQoY3RybC5kYXRhLm1ldGEpICYmICFfLmlzVW5kZWZpbmVkKGN0cmwuZGF0YS5tZXRhLnR5cGUpKSB7XG5cdFx0Ly8gcGFyc2UgdHlwZSBvZiB0aGUgcHJvcGVydHlcblx0XHR2YXIgYXJyYXkgPSBjdHJsLmRhdGEubWV0YS50eXBlWzBdLnNwbGl0KCcsJyk7XG5cdFx0YXJyYXkgPSBhcnJheS5tYXAoZnVuY3Rpb24gKGVsZW0pIHtcblx0XHRcdHJldHVybiBlbGVtLnRyaW0oKS5yZXBsYWNlKC9cXC8rJC8sICcnKS5yZXBsYWNlKC9cXFxcKyQvLCAnJykudHJpbSgpLnRvVXBwZXJDYXNlKCk7XG5cdFx0fSk7XG5cdFx0Ly8gdGhlIHByZWYgdmFsdWUgaXMgaGFuZGxlZCBvbiBpdHMgb3duIHNvIHRoYXQgd2UgY2FuIGFkZCBzb21lIGZhdm9yaXRlIGljb24gdG8gdGhlIHVpIGlmIHdlIHdhbnRcblx0XHRpZiAoYXJyYXkuaW5kZXhPZignUFJFRicpID49IDApIHtcblx0XHRcdGN0cmwuaXNQcmVmZXJyZWQgPSB0cnVlO1xuXHRcdFx0YXJyYXkuc3BsaWNlKGFycmF5LmluZGV4T2YoJ1BSRUYnKSwgMSk7XG5cdFx0fVxuXHRcdC8vIHNpbXBseSBqb2luIHRoZSB1cHBlciBjYXNlZCB0eXBlcyB0b2dldGhlciBhcyBrZXlcblx0XHRjdHJsLnR5cGUgPSBhcnJheS5qb2luKCcsJyk7XG5cdFx0dmFyIGRpc3BsYXlOYW1lID0gYXJyYXkubWFwKGZ1bmN0aW9uIChlbGVtZW50KSB7XG5cdFx0XHRyZXR1cm4gZWxlbWVudC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGVsZW1lbnQuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcblx0XHR9KS5qb2luKCcgJyk7XG5cdFx0Ly8gaW4gY2FzZSB0aGUgdHlwZSBpcyBub3QgeWV0IGluIHRoZSBkZWZhdWx0IGxpc3Qgb2YgYXZhaWxhYmxlIG9wdGlvbnMgd2UgYWRkIGl0XG5cdFx0aWYgKCFjdHJsLmF2YWlsYWJsZU9wdGlvbnMuc29tZShmdW5jdGlvbihlKSB7IHJldHVybiBlLmlkID09PSBjdHJsLnR5cGU7IH0gKSkge1xuXHRcdFx0Y3RybC5hdmFpbGFibGVPcHRpb25zID0gY3RybC5hdmFpbGFibGVPcHRpb25zLmNvbmNhdChbe2lkOiBjdHJsLnR5cGUsIG5hbWU6IGRpc3BsYXlOYW1lfV0pO1xuXHRcdH1cblxuXHRcdC8vIFJlbW92ZSBkdXBsaWNhdGUgZW50cnlcblx0XHRjdHJsLmF2YWlsYWJsZU9wdGlvbnMgPSBfLnVuaXEoY3RybC5hdmFpbGFibGVPcHRpb25zLCBmdW5jdGlvbihvcHRpb24pIHsgcmV0dXJuIG9wdGlvbi5uYW1lOyB9KTtcblx0XHRpZiAoY3RybC5hdmFpbGFibGVPcHRpb25zLmZpbHRlcihmdW5jdGlvbihvcHRpb24pIHsgcmV0dXJuIG9wdGlvbi5pZCA9PT0gY3RybC50eXBlOyB9KS5sZW5ndGggPT09IDApIHtcblx0XHRcdC8vIE91ciBkZWZhdWx0IHZhbHVlIGhhcyBiZWVuIHRocm93biBvdXQgYnkgdGhlIHVuaXEgZnVuY3Rpb24sIGxldCdzIGZpbmQgYSByZXBsYWNlbWVudFxuXHRcdFx0dmFyIG9wdGlvbk5hbWUgPSBjdHJsLm1ldGEub3B0aW9ucy5maWx0ZXIoZnVuY3Rpb24ob3B0aW9uKSB7IHJldHVybiBvcHRpb24uaWQgPT09IGN0cmwudHlwZTsgfSlbMF0ubmFtZTtcblx0XHRcdGN0cmwudHlwZSA9IGN0cmwuYXZhaWxhYmxlT3B0aW9ucy5maWx0ZXIoZnVuY3Rpb24ob3B0aW9uKSB7IHJldHVybiBvcHRpb24ubmFtZSA9PT0gb3B0aW9uTmFtZTsgfSlbMF0uaWQ7XG5cdFx0XHQvLyBXZSBkb24ndCB3YW50IHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0IGtleXMuIENvbXBhdGliaWxpdHkgPiBzdGFuZGFyZGl6YXRpb25cblx0XHRcdC8vIGN0cmwuZGF0YS5tZXRhLnR5cGVbMF0gPSBjdHJsLnR5cGU7XG5cdFx0XHQvLyBjdHJsLm1vZGVsLnVwZGF0ZUNvbnRhY3QoKTtcblx0XHR9XG5cdH1cblx0aWYgKCFfLmlzVW5kZWZpbmVkKGN0cmwuZGF0YSkgJiYgIV8uaXNVbmRlZmluZWQoY3RybC5kYXRhLm5hbWVzcGFjZSkpIHtcblx0XHRpZiAoIV8uaXNVbmRlZmluZWQoY3RybC5jb250YWN0LnByb3BzWydYLUFCTEFCRUwnXSkpIHtcblx0XHRcdHZhciB2YWwgPSBfLmZpbmQodGhpcy5jb250YWN0LnByb3BzWydYLUFCTEFCRUwnXSwgZnVuY3Rpb24oeCkgeyByZXR1cm4geC5uYW1lc3BhY2UgPT09IGN0cmwuZGF0YS5uYW1lc3BhY2U7IH0pO1xuXHRcdFx0Y3RybC50eXBlID0gdmFsLnZhbHVlLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHRpZiAoIV8uaXNVbmRlZmluZWQodmFsKSkge1xuXHRcdFx0XHQvLyBpbiBjYXNlIHRoZSB0eXBlIGlzIG5vdCB5ZXQgaW4gdGhlIGRlZmF1bHQgbGlzdCBvZiBhdmFpbGFibGUgb3B0aW9ucyB3ZSBhZGQgaXRcblx0XHRcdFx0aWYgKCFjdHJsLmF2YWlsYWJsZU9wdGlvbnMuc29tZShmdW5jdGlvbihlKSB7IHJldHVybiBlLmlkID09PSB2YWwudmFsdWU7IH0gKSkge1xuXHRcdFx0XHRcdGN0cmwuYXZhaWxhYmxlT3B0aW9ucyA9IGN0cmwuYXZhaWxhYmxlT3B0aW9ucy5jb25jYXQoW3tpZDogdmFsLnZhbHVlLnRvVXBwZXJDYXNlKCksIG5hbWU6IHZhbC52YWx1ZS50b1VwcGVyQ2FzZSgpfV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Y3RybC5hdmFpbGFibGVHcm91cHMgPSBbXTtcblxuXHRDb250YWN0U2VydmljZS5nZXRHcm91cHMoKS50aGVuKGZ1bmN0aW9uKGdyb3Vwcykge1xuXHRcdGN0cmwuYXZhaWxhYmxlR3JvdXBzID0gXy51bmlxdWUoZ3JvdXBzKTtcblx0fSk7XG5cblx0Y3RybC5jaGFuZ2VUeXBlID0gZnVuY3Rpb24gKHZhbCkge1xuXHRcdGlmIChjdHJsLmlzUHJlZmVycmVkKSB7XG5cdFx0XHR2YWwgKz0gJyxQUkVGJztcblx0XHR9XG5cdFx0Y3RybC5kYXRhLm1ldGEgPSBjdHJsLmRhdGEubWV0YSB8fCB7fTtcblx0XHRjdHJsLmRhdGEubWV0YS50eXBlID0gY3RybC5kYXRhLm1ldGEudHlwZSB8fCBbXTtcblx0XHRjdHJsLmRhdGEubWV0YS50eXBlWzBdID0gdmFsO1xuXHRcdENvbnRhY3RTZXJ2aWNlLnF1ZXVlVXBkYXRlKGN0cmwuY29udGFjdCk7XG5cdH07XG5cblx0Y3RybC5kYXRlSW5wdXRDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuXHRcdGN0cmwuZGF0YS5tZXRhID0gY3RybC5kYXRhLm1ldGEgfHwge307XG5cblx0XHR2YXIgbWF0Y2ggPSBjdHJsLmRhdGEudmFsdWUubWF0Y2goL14oXFxkezR9KS0oXFxkezJ9KS0oXFxkezJ9KSQvKTtcblx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdGN0cmwuZGF0YS5tZXRhLnZhbHVlID0gW107XG5cdFx0fSBlbHNlIHtcblx0XHRcdGN0cmwuZGF0YS5tZXRhLnZhbHVlID0gY3RybC5kYXRhLm1ldGEudmFsdWUgfHwgW107XG5cdFx0XHRjdHJsLmRhdGEubWV0YS52YWx1ZVswXSA9ICd0ZXh0Jztcblx0XHR9XG5cdFx0Q29udGFjdFNlcnZpY2UucXVldWVVcGRhdGUoY3RybC5jb250YWN0KTtcblx0fTtcblxuXHRjdHJsLnVwZGF0ZURldGFpbGVkTmFtZSA9IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgZm4gPSAnJztcblx0XHRpZiAoY3RybC5kYXRhLnZhbHVlWzNdKSB7XG5cdFx0XHRmbiArPSBjdHJsLmRhdGEudmFsdWVbM10gKyAnICc7XG5cdFx0fVxuXHRcdGlmIChjdHJsLmRhdGEudmFsdWVbMV0pIHtcblx0XHRcdGZuICs9IGN0cmwuZGF0YS52YWx1ZVsxXSArICcgJztcblx0XHR9XG5cdFx0aWYgKGN0cmwuZGF0YS52YWx1ZVsyXSkge1xuXHRcdFx0Zm4gKz0gY3RybC5kYXRhLnZhbHVlWzJdICsgJyAnO1xuXHRcdH1cblx0XHRpZiAoY3RybC5kYXRhLnZhbHVlWzBdKSB7XG5cdFx0XHRmbiArPSBjdHJsLmRhdGEudmFsdWVbMF0gKyAnICc7XG5cdFx0fVxuXHRcdGlmIChjdHJsLmRhdGEudmFsdWVbNF0pIHtcblx0XHRcdGZuICs9IGN0cmwuZGF0YS52YWx1ZVs0XTtcblx0XHR9XG5cblx0XHRjdHJsLmNvbnRhY3QuZnVsbE5hbWUoZm4pO1xuXHRcdENvbnRhY3RTZXJ2aWNlLnF1ZXVlVXBkYXRlKGN0cmwuY29udGFjdCk7XG5cdH07XG5cblx0Y3RybC51cGRhdGVDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0Q29udGFjdFNlcnZpY2UucXVldWVVcGRhdGUoY3RybC5jb250YWN0KTtcblx0fTtcblxuXHRjdHJsLmdldFRlbXBsYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRlbXBsYXRlVXJsID0gT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvZGV0YWlsSXRlbXMvJyArIGN0cmwubWV0YS50ZW1wbGF0ZSArICcuaHRtbCcpO1xuXHRcdHJldHVybiAkdGVtcGxhdGVSZXF1ZXN0KHRlbXBsYXRlVXJsKTtcblx0fTtcblxuXHRjdHJsLmRlbGV0ZUZpZWxkID0gZnVuY3Rpb24gKCkge1xuXHRcdGN0cmwuY29udGFjdC5yZW1vdmVQcm9wZXJ0eShjdHJsLm5hbWUsIGN0cmwuZGF0YSk7XG5cdFx0Q29udGFjdFNlcnZpY2UucXVldWVVcGRhdGUoY3RybC5jb250YWN0KTtcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2RldGFpbHNpdGVtJywgWyckY29tcGlsZScsIGZ1bmN0aW9uKCRjb21waWxlKSB7XG5cdHJldHVybiB7XG5cdFx0c2NvcGU6IHt9LFxuXHRcdGNvbnRyb2xsZXI6ICdkZXRhaWxzSXRlbUN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHtcblx0XHRcdG5hbWU6ICc9Jyxcblx0XHRcdGRhdGE6ICc9Jyxcblx0XHRcdGNvbnRhY3Q6ICc9bW9kZWwnLFxuXHRcdFx0aW5kZXg6ICc9J1xuXHRcdH0sXG5cdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG5cdFx0XHRjdHJsLmdldFRlbXBsYXRlKCkudGhlbihmdW5jdGlvbihodG1sKSB7XG5cdFx0XHRcdHZhciB0ZW1wbGF0ZSA9IGFuZ3VsYXIuZWxlbWVudChodG1sKTtcblx0XHRcdFx0ZWxlbWVudC5hcHBlbmQodGVtcGxhdGUpO1xuXHRcdFx0XHQkY29tcGlsZSh0ZW1wbGF0ZSkoc2NvcGUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xufV0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCdncm91cEN0cmwnLCBmdW5jdGlvbigpIHtcblx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC12YXJzXG5cdHZhciBjdHJsID0gdGhpcztcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2dyb3VwJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdBJywgLy8gaGFzIHRvIGJlIGFuIGF0dHJpYnV0ZSB0byB3b3JrIHdpdGggY29yZSBjc3Ncblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2dyb3VwQ3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge1xuXHRcdFx0Z3JvdXA6ICc9Z3JvdXAnXG5cdFx0fSxcblx0XHR0ZW1wbGF0ZVVybDogT0MubGlua1RvKCdjb250YWN0cycsICd0ZW1wbGF0ZXMvZ3JvdXAuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignZ3JvdXBsaXN0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJHRpbWVvdXQsIENvbnRhY3RTZXJ2aWNlLCBTZWFyY2hTZXJ2aWNlLCAkcm91dGVQYXJhbXMpIHtcblx0dmFyIGN0cmwgPSB0aGlzO1xuXG5cdGN0cmwuZ3JvdXBzID0gW107XG5cdGN0cmwuY29udGFjdEZpbHRlcnMgPSBbXTtcblxuXHRDb250YWN0U2VydmljZS5nZXRHcm91cExpc3QoKS50aGVuKGZ1bmN0aW9uKGdyb3Vwcykge1xuXHRcdGN0cmwuZ3JvdXBzID0gZ3JvdXBzO1xuXHR9KTtcblxuXHRDb250YWN0U2VydmljZS5nZXRDb250YWN0RmlsdGVycygpLnRoZW4oZnVuY3Rpb24oY29udGFjdEZpbHRlcnMpIHtcblx0XHRjdHJsLmNvbnRhY3RGaWx0ZXJzID0gY29udGFjdEZpbHRlcnM7XG5cdH0pO1xuXG5cdGN0cmwuZ2V0U2VsZWN0ZWQgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJHJvdXRlUGFyYW1zLmdpZDtcblx0fTtcblxuXHQvLyBVcGRhdGUgZ3JvdXBMaXN0IG9uIGNvbnRhY3QgYWRkL2RlbGV0ZS91cGRhdGUvZ3JvdXBzVXBkYXRlXG5cdENvbnRhY3RTZXJ2aWNlLnJlZ2lzdGVyT2JzZXJ2ZXJDYWxsYmFjayhmdW5jdGlvbihldikge1xuXHRcdGlmIChldi5ldmVudCAhPT0gJ2dldEZ1bGxDb250YWN0cycpIHtcblx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0JHNjb3BlLiRhcHBseShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRDb250YWN0U2VydmljZS5nZXRHcm91cExpc3QoKS50aGVuKGZ1bmN0aW9uKGdyb3Vwcykge1xuXHRcdFx0XHRcdFx0Y3RybC5ncm91cHMgPSBncm91cHM7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0Q29udGFjdFNlcnZpY2UuZ2V0Q29udGFjdEZpbHRlcnMoKS50aGVuKGZ1bmN0aW9uKGNvbnRhY3RGaWx0ZXJzKSB7XG5cdFx0XHRcdFx0XHRjdHJsLmNvbnRhY3RGaWx0ZXJzID0gY29udGFjdEZpbHRlcnM7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcblxuXHRjdHJsLnNldFNlbGVjdGVkID0gZnVuY3Rpb24gKHNlbGVjdGVkR3JvdXApIHtcblx0XHRTZWFyY2hTZXJ2aWNlLmNsZWFuU2VhcmNoKCk7XG5cdFx0JHJvdXRlUGFyYW1zLmdpZCA9IHNlbGVjdGVkR3JvdXA7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZGlyZWN0aXZlKCdncm91cGxpc3QnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRyZXN0cmljdDogJ0VBJywgLy8gaGFzIHRvIGJlIGFuIGF0dHJpYnV0ZSB0byB3b3JrIHdpdGggY29yZSBjc3Ncblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ2dyb3VwbGlzdEN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHt9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9ncm91cExpc3QuaHRtbCcpXG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uY29udHJvbGxlcignaW1wb3J0c2NyZWVuQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgSW1wb3J0U2VydmljZSkge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC50ID0ge1xuXHRcdGltcG9ydGluZ1RvIDogdCgnY29udGFjdHMnLCAnSW1wb3J0aW5nIGludG8nKSxcblx0XHRzZWxlY3RBZGRyZXNzYm9vayA6IHQoJ2NvbnRhY3RzJywgJ1NlbGVjdCB5b3VyIGFkZHJlc3Nib29rJylcblx0fTtcblxuXHQvLyBCcm9hZGNhc3QgdXBkYXRlXG5cdCRzY29wZS4kb24oJ2ltcG9ydGluZycsIGZ1bmN0aW9uICgpIHtcblx0XHRjdHJsLnNlbGVjdGVkQWRkcmVzc0Jvb2sgPSBJbXBvcnRTZXJ2aWNlLnNlbGVjdGVkQWRkcmVzc0Jvb2s7XG5cdFx0Y3RybC5pbXBvcnRlZFVzZXIgPSBJbXBvcnRTZXJ2aWNlLmltcG9ydGVkVXNlcjtcblx0XHRjdHJsLmltcG9ydGluZyA9IEltcG9ydFNlcnZpY2UuaW1wb3J0aW5nO1xuXHRcdGN0cmwuaW1wb3J0UGVyY2VudCA9IEltcG9ydFNlcnZpY2UuaW1wb3J0UGVyY2VudDtcblx0fSk7XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ2ltcG9ydHNjcmVlbicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRUEnLCAvLyBoYXMgdG8gYmUgYW4gYXR0cmlidXRlIHRvIHdvcmsgd2l0aCBjb3JlIGNzc1xuXHRcdHNjb3BlOiB7fSxcblx0XHRjb250cm9sbGVyOiAnaW1wb3J0c2NyZWVuQ3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge30sXG5cdFx0dGVtcGxhdGVVcmw6IE9DLmxpbmtUbygnY29udGFjdHMnLCAndGVtcGxhdGVzL2ltcG9ydFNjcmVlbi5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5jb250cm9sbGVyKCduZXdDb250YWN0QnV0dG9uQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgQ29udGFjdFNlcnZpY2UsICRyb3V0ZVBhcmFtcywgdkNhcmRQcm9wZXJ0aWVzU2VydmljZSkge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC50ID0ge1xuXHRcdGFkZENvbnRhY3QgOiB0KCdjb250YWN0cycsICdOZXcgY29udGFjdCcpXG5cdH07XG5cblx0Y3RybC5jcmVhdGVDb250YWN0ID0gZnVuY3Rpb24oKSB7XG5cdFx0Q29udGFjdFNlcnZpY2UuY3JlYXRlKCkudGhlbihmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRbJ3RlbCcsICdhZHInLCAnZW1haWwnXS5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkKSB7XG5cdFx0XHRcdHZhciBkZWZhdWx0VmFsdWUgPSB2Q2FyZFByb3BlcnRpZXNTZXJ2aWNlLmdldE1ldGEoZmllbGQpLmRlZmF1bHRWYWx1ZSB8fCB7dmFsdWU6ICcnfTtcblx0XHRcdFx0Y29udGFjdC5hZGRQcm9wZXJ0eShmaWVsZCwgZGVmYXVsdFZhbHVlKTtcblx0XHRcdH0gKTtcblx0XHRcdGlmIChbdCgnY29udGFjdHMnLCAnQWxsIGNvbnRhY3RzJyksIHQoJ2NvbnRhY3RzJywgJ05vdCBncm91cGVkJyldLmluZGV4T2YoJHJvdXRlUGFyYW1zLmdpZCkgPT09IC0xKSB7XG5cdFx0XHRcdGNvbnRhY3QuY2F0ZWdvcmllcyhbICRyb3V0ZVBhcmFtcy5naWQgXSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb250YWN0LmNhdGVnb3JpZXMoW10pO1xuXHRcdFx0fVxuXHRcdFx0JCgnI2RldGFpbHMtZnVsbE5hbWUnKS5mb2N1cygpO1xuXHRcdH0pO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgnbmV3Y29udGFjdGJ1dHRvbicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRUEnLCAvLyBoYXMgdG8gYmUgYW4gYXR0cmlidXRlIHRvIHdvcmsgd2l0aCBjb3JlIGNzc1xuXHRcdHNjb3BlOiB7fSxcblx0XHRjb250cm9sbGVyOiAnbmV3Q29udGFjdEJ1dHRvbkN0cmwnLFxuXHRcdGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuXHRcdGJpbmRUb0NvbnRyb2xsZXI6IHt9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9uZXdDb250YWN0QnV0dG9uLmh0bWwnKVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmRpcmVjdGl2ZSgndGVsTW9kZWwnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJue1xuXHRcdHJlc3RyaWN0OiAnQScsXG5cdFx0cmVxdWlyZTogJ25nTW9kZWwnLFxuXHRcdGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRyLCBuZ01vZGVsKSB7XG5cdFx0XHRuZ01vZGVsLiRmb3JtYXR0ZXJzLnB1c2goZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0XHRuZ01vZGVsLiRwYXJzZXJzLnB1c2goZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ3Byb3BlcnR5R3JvdXBDdHJsJywgZnVuY3Rpb24odkNhcmRQcm9wZXJ0aWVzU2VydmljZSkge1xuXHR2YXIgY3RybCA9IHRoaXM7XG5cblx0Y3RybC5tZXRhID0gdkNhcmRQcm9wZXJ0aWVzU2VydmljZS5nZXRNZXRhKGN0cmwubmFtZSk7XG5cblx0dGhpcy5pc0hpZGRlbiA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBjdHJsLm1ldGEuaGFzT3duUHJvcGVydHkoJ2hpZGRlbicpICYmIGN0cmwubWV0YS5oaWRkZW4gPT09IHRydWU7XG5cdH07XG5cblx0dGhpcy5nZXRJY29uQ2xhc3MgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gY3RybC5tZXRhLmljb24gfHwgJ2ljb24tY29udGFjdHMtZGFyayc7XG5cdH07XG5cblx0dGhpcy5nZXRSZWFkYWJsZU5hbWUgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gY3RybC5tZXRhLnJlYWRhYmxlTmFtZTtcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ3Byb3BlcnR5Z3JvdXAnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRzY29wZToge30sXG5cdFx0Y29udHJvbGxlcjogJ3Byb3BlcnR5R3JvdXBDdHJsJyxcblx0XHRjb250cm9sbGVyQXM6ICdjdHJsJyxcblx0XHRiaW5kVG9Db250cm9sbGVyOiB7XG5cdFx0XHRwcm9wZXJ0aWVzOiAnPWRhdGEnLFxuXHRcdFx0bmFtZTogJz0nLFxuXHRcdFx0Y29udGFjdDogJz1tb2RlbCdcblx0XHR9LFxuXHRcdHRlbXBsYXRlVXJsOiBPQy5saW5rVG8oJ2NvbnRhY3RzJywgJ3RlbXBsYXRlcy9wcm9wZXJ0eUdyb3VwLmh0bWwnKSxcblx0XHRsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0cmwpIHtcblx0XHRcdGlmKGN0cmwuaXNIaWRkZW4oKSkge1xuXHRcdFx0XHQvLyBUT0RPIHJlcGxhY2Ugd2l0aCBjbGFzc1xuXHRcdFx0XHRlbGVtZW50LmNzcygnZGlzcGxheScsICdub25lJyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmNvbnRyb2xsZXIoJ3NvcnRieUN0cmwnLCBmdW5jdGlvbihTb3J0QnlTZXJ2aWNlKSB7XG5cdHZhciBjdHJsID0gdGhpcztcblxuXHR2YXIgc29ydFRleHQgPSB0KCdjb250YWN0cycsICdTb3J0IGJ5Jyk7XG5cdGN0cmwuc29ydFRleHQgPSBzb3J0VGV4dDtcblxuXHR2YXIgc29ydExpc3QgPSBTb3J0QnlTZXJ2aWNlLmdldFNvcnRCeUxpc3QoKTtcblx0Y3RybC5zb3J0TGlzdCA9IHNvcnRMaXN0O1xuXG5cdGN0cmwuZGVmYXVsdE9yZGVyID0gU29ydEJ5U2VydmljZS5nZXRTb3J0QnlLZXkoKTtcblxuXHRjdHJsLnVwZGF0ZVNvcnRCeSA9IGZ1bmN0aW9uKCkge1xuXHRcdFNvcnRCeVNlcnZpY2Uuc2V0U29ydEJ5KGN0cmwuZGVmYXVsdE9yZGVyKTtcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5kaXJlY3RpdmUoJ3NvcnRieScsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdHByaW9yaXR5OiAxLFxuXHRcdHNjb3BlOiB7fSxcblx0XHRjb250cm9sbGVyOiAnc29ydGJ5Q3RybCcsXG5cdFx0Y29udHJvbGxlckFzOiAnY3RybCcsXG5cdFx0YmluZFRvQ29udHJvbGxlcjoge30sXG5cdFx0dGVtcGxhdGVVcmw6IE9DLmxpbmtUbygnY29udGFjdHMnLCAndGVtcGxhdGVzL3NvcnRCeS5odG1sJylcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5mYWN0b3J5KCdBZGRyZXNzQm9vaycsIGZ1bmN0aW9uKClcbntcblx0cmV0dXJuIGZ1bmN0aW9uIEFkZHJlc3NCb29rKGRhdGEpIHtcblx0XHRhbmd1bGFyLmV4dGVuZCh0aGlzLCB7XG5cblx0XHRcdGRpc3BsYXlOYW1lOiAnJyxcblx0XHRcdGNvbnRhY3RzOiBbXSxcblx0XHRcdGdyb3VwczogZGF0YS5kYXRhLnByb3BzLmdyb3Vwcyxcblx0XHRcdHJlYWRPbmx5OiBkYXRhLmRhdGEucHJvcHMucmVhZE9ubHkgPT09ICcxJyxcblx0XHRcdC8vIEluIGNhc2Ugb2Ygbm90IGRlZmluZWRcblx0XHRcdGVuYWJsZWQ6IGRhdGEuZGF0YS5wcm9wcy5lbmFibGVkICE9PSAnMCcsXG5cblx0XHRcdHNoYXJlZFdpdGg6IHtcblx0XHRcdFx0dXNlcnM6IFtdLFxuXHRcdFx0XHRncm91cHM6IFtdXG5cdFx0XHR9XG5cblx0XHR9KTtcblx0XHRhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhKTtcblx0XHRhbmd1bGFyLmV4dGVuZCh0aGlzLCB7XG5cdFx0XHRvd25lcjogZGF0YS5kYXRhLnByb3BzLm93bmVyLnNwbGl0KCcvJykuc2xpY2UoLTIsIC0xKVswXVxuXHRcdH0pO1xuXG5cdFx0dmFyIHNoYXJlcyA9IHRoaXMuZGF0YS5wcm9wcy5pbnZpdGU7XG5cdFx0aWYgKHR5cGVvZiBzaGFyZXMgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHNoYXJlcy5sZW5ndGg7IGorKykge1xuXHRcdFx0XHR2YXIgaHJlZiA9IHNoYXJlc1tqXS5ocmVmO1xuXHRcdFx0XHRpZiAoaHJlZi5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgYWNjZXNzID0gc2hhcmVzW2pdLmFjY2Vzcztcblx0XHRcdFx0aWYgKGFjY2Vzcy5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciByZWFkV3JpdGUgPSAodHlwZW9mIGFjY2Vzcy5yZWFkV3JpdGUgIT09ICd1bmRlZmluZWQnKTtcblxuXHRcdFx0XHRpZiAoaHJlZi5zdGFydHNXaXRoKCdwcmluY2lwYWw6cHJpbmNpcGFscy91c2Vycy8nKSkge1xuXHRcdFx0XHRcdHRoaXMuc2hhcmVkV2l0aC51c2Vycy5wdXNoKHtcblx0XHRcdFx0XHRcdGlkOiBocmVmLnN1YnN0cigyNyksXG5cdFx0XHRcdFx0XHRkaXNwbGF5bmFtZTogaHJlZi5zdWJzdHIoMjcpLFxuXHRcdFx0XHRcdFx0d3JpdGFibGU6IHJlYWRXcml0ZVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGhyZWYuc3RhcnRzV2l0aCgncHJpbmNpcGFsOnByaW5jaXBhbHMvZ3JvdXBzLycpKSB7XG5cdFx0XHRcdFx0dGhpcy5zaGFyZWRXaXRoLmdyb3Vwcy5wdXNoKHtcblx0XHRcdFx0XHRcdGlkOiBocmVmLnN1YnN0cigyOCksXG5cdFx0XHRcdFx0XHRkaXNwbGF5bmFtZTogaHJlZi5zdWJzdHIoMjgpLFxuXHRcdFx0XHRcdFx0d3JpdGFibGU6IHJlYWRXcml0ZVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuXHQuZmFjdG9yeSgnQ29udGFjdEZpbHRlcicsIGZ1bmN0aW9uKClcblx0e1xuXHRcdHJldHVybiBmdW5jdGlvbiBDb250YWN0RmlsdGVyKGRhdGEpIHtcblx0XHRcdGFuZ3VsYXIuZXh0ZW5kKHRoaXMsIHtcblx0XHRcdFx0bmFtZTogJycsXG5cdFx0XHRcdGNvdW50OiAwXG5cdFx0XHR9KTtcblxuXHRcdFx0YW5ndWxhci5leHRlbmQodGhpcywgZGF0YSk7XG5cdFx0fTtcblx0fSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZhY3RvcnkoJ0NvbnRhY3QnLCBmdW5jdGlvbigkZmlsdGVyLCBNaW1lU2VydmljZSwgdXVpZDQpIHtcblx0cmV0dXJuIGZ1bmN0aW9uIENvbnRhY3QoYWRkcmVzc0Jvb2ssIHZDYXJkKSB7XG5cdFx0YW5ndWxhci5leHRlbmQodGhpcywge1xuXG5cdFx0XHRkYXRhOiB7fSxcblx0XHRcdHByb3BzOiB7fSxcblx0XHRcdGZhaWxlZFByb3BzOiBbXSxcblxuXHRcdFx0ZGF0ZVByb3BlcnRpZXM6IFsnYmRheScsICdhbm5pdmVyc2FyeScsICdkZWF0aGRhdGUnXSxcblxuXHRcdFx0YWRkcmVzc0Jvb2tJZDogYWRkcmVzc0Jvb2suZGlzcGxheU5hbWUsXG5cdFx0XHRyZWFkT25seTogYWRkcmVzc0Jvb2sucmVhZE9ubHksXG5cblx0XHRcdHZlcnNpb246IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCd2ZXJzaW9uJyk7XG5cdFx0XHRcdGlmKHByb3BlcnR5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdH0sXG5cblx0XHRcdHVpZDogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0dmFyIG1vZGVsID0gdGhpcztcblx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbHVlKSkge1xuXHRcdFx0XHRcdC8vIHNldHRlclxuXHRcdFx0XHRcdHJldHVybiBtb2RlbC5zZXRQcm9wZXJ0eSgndWlkJywgeyB2YWx1ZTogdmFsdWUgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gZ2V0dGVyXG5cdFx0XHRcdFx0dmFyIHVpZCA9IG1vZGVsLmdldFByb3BlcnR5KCd1aWQnKS52YWx1ZTtcblx0XHRcdFx0XHQvKiBnbG9iYWwgbWQ1ICovXG5cdFx0XHRcdFx0cmV0dXJuIHV1aWQ0LnZhbGlkYXRlKHVpZCkgPyB1aWQgOiBtZDUodWlkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0ZGlzcGxheU5hbWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgZGlzcGxheU5hbWUgPSB0aGlzLmZ1bGxOYW1lKCkgfHwgdGhpcy5vcmcoKSB8fCAnJztcblx0XHRcdFx0aWYoYW5ndWxhci5pc0FycmF5KGRpc3BsYXlOYW1lKSkge1xuXHRcdFx0XHRcdHJldHVybiBkaXNwbGF5TmFtZS5qb2luKCcgJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGRpc3BsYXlOYW1lO1xuXHRcdFx0fSxcblxuXHRcdFx0cmVhZGFibGVGaWxlbmFtZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmKHRoaXMuZGlzcGxheU5hbWUoKSkge1xuXHRcdFx0XHRcdHJldHVybiAodGhpcy5kaXNwbGF5TmFtZSgpKSArICcudmNmJztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBmYWxsYmFjayB0byBkZWZhdWx0IGZpbGVuYW1lIChzZWUgZG93bmxvYWQgYXR0cmlidXRlKVxuXHRcdFx0XHRcdHJldHVybiAnJztcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXG5cdFx0XHRmaXJzdE5hbWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCduJyk7XG5cdFx0XHRcdGlmIChwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZVsxXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kaXNwbGF5TmFtZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHRsYXN0TmFtZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBwcm9wZXJ0eSA9IHRoaXMuZ2V0UHJvcGVydHkoJ24nKTtcblx0XHRcdFx0aWYgKHByb3BlcnR5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlWzBdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmRpc3BsYXlOYW1lKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGFkZGl0aW9uYWxOYW1lczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBwcm9wZXJ0eSA9IHRoaXMuZ2V0UHJvcGVydHkoJ24nKTtcblx0XHRcdFx0aWYgKHByb3BlcnR5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlWzJdO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiAnJztcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0ZnVsbE5hbWU6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHZhciBtb2RlbCA9IHRoaXM7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcblx0XHRcdFx0XHQvLyBzZXR0ZXJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zZXRQcm9wZXJ0eSgnZm4nLCB7IHZhbHVlOiB2YWx1ZSB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBnZXR0ZXJcblx0XHRcdFx0XHR2YXIgcHJvcGVydHkgPSBtb2RlbC5nZXRQcm9wZXJ0eSgnZm4nKTtcblx0XHRcdFx0XHRpZihwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwcm9wZXJ0eSA9IG1vZGVsLmdldFByb3BlcnR5KCduJyk7XG5cdFx0XHRcdFx0aWYocHJvcGVydHkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZS5maWx0ZXIoZnVuY3Rpb24oZWxlbSkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZWxlbTtcblx0XHRcdFx0XHRcdH0pLmpvaW4oJyAnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0dGl0bGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcblx0XHRcdFx0XHQvLyBzZXR0ZXJcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zZXRQcm9wZXJ0eSgndGl0bGUnLCB7IHZhbHVlOiB2YWx1ZSB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBnZXR0ZXJcblx0XHRcdFx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCd0aXRsZScpO1xuXHRcdFx0XHRcdGlmKHByb3BlcnR5KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcHJvcGVydHkudmFsdWU7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHRvcmc6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdHZhciBwcm9wZXJ0eSA9IHRoaXMuZ2V0UHJvcGVydHkoJ29yZycpO1xuXHRcdFx0XHRpZiAoYW5ndWxhci5pc0RlZmluZWQodmFsdWUpKSB7XG5cdFx0XHRcdFx0dmFyIHZhbCA9IHZhbHVlO1xuXHRcdFx0XHRcdC8vIHNldHRlclxuXHRcdFx0XHRcdGlmKHByb3BlcnR5ICYmIEFycmF5LmlzQXJyYXkocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHR2YWwgPSBwcm9wZXJ0eS52YWx1ZTtcblx0XHRcdFx0XHRcdHZhbFswXSA9IHZhbHVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zZXRQcm9wZXJ0eSgnb3JnJywgeyB2YWx1ZTogdmFsIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIGdldHRlclxuXHRcdFx0XHRcdGlmKHByb3BlcnR5KSB7XG5cdFx0XHRcdFx0XHRpZiAoQXJyYXkuaXNBcnJheShwcm9wZXJ0eS52YWx1ZSkpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlWzBdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHByb3BlcnR5LnZhbHVlO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0ZW1haWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvLyBnZXR0ZXJcblx0XHRcdFx0dmFyIHByb3BlcnR5ID0gdGhpcy5nZXRQcm9wZXJ0eSgnZW1haWwnKTtcblx0XHRcdFx0aWYocHJvcGVydHkpIHtcblx0XHRcdFx0XHRyZXR1cm4gcHJvcGVydHkudmFsdWU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0cGhvdG86IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzRGVmaW5lZCh2YWx1ZSkpIHtcblx0XHRcdFx0XHQvLyBzZXR0ZXJcblx0XHRcdFx0XHQvLyBzcGxpdHMgaW1hZ2UgZGF0YSBpbnRvIFwiZGF0YTppbWFnZS9qcGVnXCIgYW5kIGJhc2UgNjQgZW5jb2RlZCBpbWFnZVxuXHRcdFx0XHRcdHZhciBpbWFnZURhdGEgPSB2YWx1ZS5zcGxpdCgnO2Jhc2U2NCwnKTtcblx0XHRcdFx0XHR2YXIgaW1hZ2VUeXBlID0gaW1hZ2VEYXRhWzBdLnNsaWNlKCdkYXRhOicubGVuZ3RoKTtcblx0XHRcdFx0XHRpZiAoIWltYWdlVHlwZS5zdGFydHNXaXRoKCdpbWFnZS8nKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpbWFnZVR5cGUgPSBpbWFnZVR5cGUuc3Vic3RyaW5nKDYpLnRvVXBwZXJDYXNlKCk7XG5cblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zZXRQcm9wZXJ0eSgncGhvdG8nLCB7IHZhbHVlOiBpbWFnZURhdGFbMV0sIG1ldGE6IHt0eXBlOiBbaW1hZ2VUeXBlXSwgZW5jb2Rpbmc6IFsnYiddfSB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCdwaG90bycpO1xuXHRcdFx0XHRcdGlmKHByb3BlcnR5KSB7XG5cdFx0XHRcdFx0XHR2YXIgdHlwZSA9IHByb3BlcnR5Lm1ldGEudHlwZTtcblx0XHRcdFx0XHRcdGlmIChhbmd1bGFyLmlzQXJyYXkodHlwZSkpIHtcblx0XHRcdFx0XHRcdFx0dHlwZSA9IHR5cGVbMF07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIXR5cGUuc3RhcnRzV2l0aCgnaW1hZ2UvJykpIHtcblx0XHRcdFx0XHRcdFx0dHlwZSA9ICdpbWFnZS8nICsgdHlwZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICdkYXRhOicgKyB0eXBlICsgJztiYXNlNjQsJyArIHByb3BlcnR5LnZhbHVlO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0Y2F0ZWdvcmllczogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNEZWZpbmVkKHZhbHVlKSkge1xuXHRcdFx0XHRcdC8vIHNldHRlclxuXHRcdFx0XHRcdGlmIChhbmd1bGFyLmlzU3RyaW5nKHZhbHVlKSkge1xuXHRcdFx0XHRcdFx0LyogY2hlY2sgZm9yIGVtcHR5IHN0cmluZyAqL1xuXHRcdFx0XHRcdFx0dGhpcy5zZXRQcm9wZXJ0eSgnY2F0ZWdvcmllcycsIHsgdmFsdWU6ICF2YWx1ZS5sZW5ndGggPyBbXSA6IFt2YWx1ZV0gfSk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChhbmd1bGFyLmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0XHRcdFx0XHR0aGlzLnNldFByb3BlcnR5KCdjYXRlZ29yaWVzJywgeyB2YWx1ZTogdmFsdWUgfSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIGdldHRlclxuXHRcdFx0XHRcdHZhciBwcm9wZXJ0eSA9IHRoaXMuZ2V0UHJvcGVydHkoJ2NhdGVnb3JpZXMnKTtcblx0XHRcdFx0XHRpZighcHJvcGVydHkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBbXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNBcnJheShwcm9wZXJ0eS52YWx1ZSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIFtwcm9wZXJ0eS52YWx1ZV07XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdGZvcm1hdERhdGVBc1JGQzYzNTA6IGZ1bmN0aW9uKG5hbWUsIGRhdGEpIHtcblx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQoZGF0YSkgfHwgYW5ndWxhci5pc1VuZGVmaW5lZChkYXRhLnZhbHVlKSkge1xuXHRcdFx0XHRcdHJldHVybiBkYXRhO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0aGlzLmRhdGVQcm9wZXJ0aWVzLmluZGV4T2YobmFtZSkgIT09IC0xKSB7XG5cdFx0XHRcdFx0dmFyIG1hdGNoID0gZGF0YS52YWx1ZS5tYXRjaCgvXihcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pJC8pO1xuXHRcdFx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRcdFx0ZGF0YS52YWx1ZSA9IG1hdGNoWzFdICsgbWF0Y2hbMl0gKyBtYXRjaFszXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gZGF0YTtcblx0XHRcdH0sXG5cblx0XHRcdGZvcm1hdERhdGVGb3JEaXNwbGF5OiBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKGRhdGEpIHx8IGFuZ3VsYXIuaXNVbmRlZmluZWQoZGF0YS52YWx1ZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gZGF0YTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodGhpcy5kYXRlUHJvcGVydGllcy5pbmRleE9mKG5hbWUpICE9PSAtMSkge1xuXHRcdFx0XHRcdHZhciBtYXRjaCA9IGRhdGEudmFsdWUubWF0Y2goL14oXFxkezR9KShcXGR7Mn0pKFxcZHsyfSkkLyk7XG5cdFx0XHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdFx0XHRkYXRhLnZhbHVlID0gbWF0Y2hbMV0gKyAnLScgKyBtYXRjaFsyXSArICctJyArIG1hdGNoWzNdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBkYXRhO1xuXHRcdFx0fSxcblxuXHRcdFx0Z2V0UHJvcGVydHk6IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRcdFx0aWYgKHRoaXMucHJvcHNbbmFtZV0pIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5mb3JtYXREYXRlRm9yRGlzcGxheShuYW1lLCB0aGlzLnZhbGlkYXRlKG5hbWUsIHRoaXMucHJvcHNbbmFtZV1bMF0pKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0YWRkUHJvcGVydHk6IGZ1bmN0aW9uKG5hbWUsIGRhdGEpIHtcblx0XHRcdFx0ZGF0YSA9IGFuZ3VsYXIuY29weShkYXRhKTtcblx0XHRcdFx0ZGF0YSA9IHRoaXMuZm9ybWF0RGF0ZUFzUkZDNjM1MChuYW1lLCBkYXRhKTtcblx0XHRcdFx0aWYoIXRoaXMucHJvcHNbbmFtZV0pIHtcblx0XHRcdFx0XHR0aGlzLnByb3BzW25hbWVdID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGlkeCA9IHRoaXMucHJvcHNbbmFtZV0ubGVuZ3RoO1xuXHRcdFx0XHR0aGlzLnByb3BzW25hbWVdW2lkeF0gPSBkYXRhO1xuXG5cdFx0XHRcdC8vIGtlZXAgdkNhcmQgaW4gc3luY1xuXHRcdFx0XHR0aGlzLmRhdGEuYWRkcmVzc0RhdGEgPSAkZmlsdGVyKCdKU09OMnZDYXJkJykodGhpcy5wcm9wcyk7XG5cdFx0XHRcdHJldHVybiBpZHg7XG5cdFx0XHR9LFxuXHRcdFx0c2V0UHJvcGVydHk6IGZ1bmN0aW9uKG5hbWUsIGRhdGEpIHtcblx0XHRcdFx0aWYoIXRoaXMucHJvcHNbbmFtZV0pIHtcblx0XHRcdFx0XHR0aGlzLnByb3BzW25hbWVdID0gW107XG5cdFx0XHRcdH1cblx0XHRcdFx0ZGF0YSA9IHRoaXMuZm9ybWF0RGF0ZUFzUkZDNjM1MChuYW1lLCBkYXRhKTtcblx0XHRcdFx0dGhpcy5wcm9wc1tuYW1lXVswXSA9IGRhdGE7XG5cblx0XHRcdFx0Ly8ga2VlcCB2Q2FyZCBpbiBzeW5jXG5cdFx0XHRcdHRoaXMuZGF0YS5hZGRyZXNzRGF0YSA9ICRmaWx0ZXIoJ0pTT04ydkNhcmQnKSh0aGlzLnByb3BzKTtcblx0XHRcdH0sXG5cdFx0XHRyZW1vdmVQcm9wZXJ0eTogZnVuY3Rpb24gKG5hbWUsIHByb3ApIHtcblx0XHRcdFx0YW5ndWxhci5jb3B5KF8ud2l0aG91dCh0aGlzLnByb3BzW25hbWVdLCBwcm9wKSwgdGhpcy5wcm9wc1tuYW1lXSk7XG5cdFx0XHRcdGlmKHRoaXMucHJvcHNbbmFtZV0ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIHRoaXMucHJvcHNbbmFtZV07XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5kYXRhLmFkZHJlc3NEYXRhID0gJGZpbHRlcignSlNPTjJ2Q2FyZCcpKHRoaXMucHJvcHMpO1xuXHRcdFx0fSxcblx0XHRcdHNldEVUYWc6IGZ1bmN0aW9uKGV0YWcpIHtcblx0XHRcdFx0dGhpcy5kYXRhLmV0YWcgPSBldGFnO1xuXHRcdFx0fSxcblx0XHRcdHNldFVybDogZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIHVpZCkge1xuXHRcdFx0XHR0aGlzLmRhdGEudXJsID0gYWRkcmVzc0Jvb2sudXJsICsgdWlkICsgJy52Y2YnO1xuXHRcdFx0fSxcblx0XHRcdHNldEFkZHJlc3NCb29rOiBmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0XHR0aGlzLmFkZHJlc3NCb29rSWQgPSBhZGRyZXNzQm9vay5kaXNwbGF5TmFtZTtcblx0XHRcdFx0dGhpcy5kYXRhLnVybCA9IGFkZHJlc3NCb29rLnVybCArIHRoaXMudWlkKCkgKyAnLnZjZic7XG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRJU09EYXRlOiBmdW5jdGlvbihkYXRlKSB7XG5cdFx0XHRcdGZ1bmN0aW9uIHBhZChudW1iZXIpIHtcblx0XHRcdFx0XHRpZiAobnVtYmVyIDwgMTApIHtcblx0XHRcdFx0XHRcdHJldHVybiAnMCcgKyBudW1iZXI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiAnJyArIG51bWJlcjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgKyAnJyArXG5cdFx0XHRcdFx0XHRwYWQoZGF0ZS5nZXRVVENNb250aCgpICsgMSkgK1xuXHRcdFx0XHRcdFx0cGFkKGRhdGUuZ2V0VVRDRGF0ZSgpKSArXG5cdFx0XHRcdFx0XHQnVCcgKyBwYWQoZGF0ZS5nZXRVVENIb3VycygpKSArXG5cdFx0XHRcdFx0XHRwYWQoZGF0ZS5nZXRVVENNaW51dGVzKCkpICtcblx0XHRcdFx0XHRcdHBhZChkYXRlLmdldFVUQ1NlY29uZHMoKSkgKyAnWic7XG5cdFx0XHR9LFxuXG5cdFx0XHRzeW5jVkNhcmQ6IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHRcdHRoaXMuc2V0UHJvcGVydHkoJ3JldicsIHsgdmFsdWU6IHRoaXMuZ2V0SVNPRGF0ZShuZXcgRGF0ZSgpKSB9KTtcblx0XHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHRcdF8uZWFjaCh0aGlzLmRhdGVQcm9wZXJ0aWVzLCBmdW5jdGlvbihuYW1lKSB7XG5cdFx0XHRcdFx0aWYgKCFhbmd1bGFyLmlzVW5kZWZpbmVkKHNlbGYucHJvcHNbbmFtZV0pICYmICFhbmd1bGFyLmlzVW5kZWZpbmVkKHNlbGYucHJvcHNbbmFtZV1bMF0pKSB7XG5cdFx0XHRcdFx0XHQvLyBTZXQgZGF0ZXMgYWdhaW4gdG8gbWFrZSBzdXJlIHRoZXkgYXJlIGluIFJGQy02MzUwIGZvcm1hdFxuXHRcdFx0XHRcdFx0c2VsZi5zZXRQcm9wZXJ0eShuYW1lLCBzZWxmLnByb3BzW25hbWVdWzBdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQvLyBmb3JjZSBmbiB0byBiZSBzZXRcblx0XHRcdFx0dGhpcy5mdWxsTmFtZSh0aGlzLmZ1bGxOYW1lKCkpO1xuXG5cdFx0XHRcdC8vIGtlZXAgdkNhcmQgaW4gc3luY1xuXHRcdFx0XHRzZWxmLmRhdGEuYWRkcmVzc0RhdGEgPSAkZmlsdGVyKCdKU09OMnZDYXJkJykoc2VsZi5wcm9wcyk7XG5cblx0XHRcdFx0Ly8gUmV2YWxpZGF0ZSBhbGwgcHJvcHNcblx0XHRcdFx0Xy5lYWNoKHNlbGYuZmFpbGVkUHJvcHMsIGZ1bmN0aW9uKG5hbWUsIGluZGV4KSB7XG5cdFx0XHRcdFx0aWYgKCFhbmd1bGFyLmlzVW5kZWZpbmVkKHNlbGYucHJvcHNbbmFtZV0pICYmICFhbmd1bGFyLmlzVW5kZWZpbmVkKHNlbGYucHJvcHNbbmFtZV1bMF0pKSB7XG5cdFx0XHRcdFx0XHQvLyBSZXNldCBwcmV2aW91c2x5IGZhaWxlZCBwcm9wZXJ0aWVzXG5cdFx0XHRcdFx0XHRzZWxmLmZhaWxlZFByb3BzLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHRcdFx0XHQvLyBBbmQgcmV2YWxpZGF0ZSB0aGVtIGFnYWluXG5cdFx0XHRcdFx0XHRzZWxmLnZhbGlkYXRlKG5hbWUsIHNlbGYucHJvcHNbbmFtZV1bMF0pO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmKGFuZ3VsYXIuaXNVbmRlZmluZWQoc2VsZi5wcm9wc1tuYW1lXSkgfHwgYW5ndWxhci5pc1VuZGVmaW5lZChzZWxmLnByb3BzW25hbWVdWzBdKSkge1xuXHRcdFx0XHRcdFx0Ly8gUHJvcGVydHkgaGFzIGJlZW4gcmVtb3ZlZFxuXHRcdFx0XHRcdFx0c2VsZi5mYWlsZWRQcm9wcy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdH0sXG5cblx0XHRcdG1hdGNoZXM6IGZ1bmN0aW9uKHBhdHRlcm4pIHtcblx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQocGF0dGVybikgfHwgcGF0dGVybi5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgbW9kZWwgPSB0aGlzO1xuXHRcdFx0XHR2YXIgbWF0Y2hpbmdQcm9wcyA9IFsnZm4nLCAndGl0bGUnLCAnb3JnJywgJ2VtYWlsJywgJ25pY2tuYW1lJywgJ25vdGUnLCAndXJsJywgJ2Nsb3VkJywgJ2FkcicsICdpbXBwJywgJ3RlbCcsICdnZW5kZXInLCAncmVsYXRpb25zaGlwJ10uZmlsdGVyKGZ1bmN0aW9uIChwcm9wTmFtZSkge1xuXHRcdFx0XHRcdGlmIChtb2RlbC5wcm9wc1twcm9wTmFtZV0pIHtcblx0XHRcdFx0XHRcdHJldHVybiBtb2RlbC5wcm9wc1twcm9wTmFtZV0uZmlsdGVyKGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoIXByb3BlcnR5LnZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGlmIChhbmd1bGFyLmlzU3RyaW5nKHByb3BlcnR5LnZhbHVlKSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBwcm9wZXJ0eS52YWx1ZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocGF0dGVybi50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNBcnJheShwcm9wZXJ0eS52YWx1ZSkpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gcHJvcGVydHkudmFsdWUuZmlsdGVyKGZ1bmN0aW9uKHYpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB2LnRvTG93ZXJDYXNlKCkuaW5kZXhPZihwYXR0ZXJuLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcblx0XHRcdFx0XHRcdFx0XHR9KS5sZW5ndGggPiAwO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdH0pLmxlbmd0aCA+IDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybiBtYXRjaGluZ1Byb3BzLmxlbmd0aCA+IDA7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5cdFx0XHR2YWxpZGF0ZTogZnVuY3Rpb24ocHJvcCwgcHJvcGVydHkpIHtcblx0XHRcdFx0c3dpdGNoKHByb3ApIHtcblx0XHRcdFx0Y2FzZSAncmV2Jzpcblx0XHRcdFx0Y2FzZSAncHJvZGlkJzpcblx0XHRcdFx0Y2FzZSAndmVyc2lvbic6XG5cdFx0XHRcdFx0aWYgKCFhbmd1bGFyLmlzVW5kZWZpbmVkKHRoaXMucHJvcHNbcHJvcF0pICYmIHRoaXMucHJvcHNbcHJvcF0ubGVuZ3RoID4gMSkge1xuXHRcdFx0XHRcdFx0dGhpcy5wcm9wc1twcm9wXSA9IFt0aGlzLnByb3BzW3Byb3BdWzBdXTtcblx0XHRcdFx0XHRcdGNvbnNvbGUud2Fybih0aGlzLnVpZCgpKyc6IFRvbyBtYW55ICcrcHJvcCsnIGZpZWxkcy4gU2F2aW5nIHRoaXMgb25lIG9ubHk6ICcgKyB0aGlzLnByb3BzW3Byb3BdWzBdLnZhbHVlKTtcblx0XHRcdFx0XHRcdHRoaXMuZmFpbGVkUHJvcHMucHVzaChwcm9wKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSAnY2F0ZWdvcmllcyc6XG5cdFx0XHRcdFx0Ly8gQXZvaWQgdW5lc2NhcGVkIGNvbW1hc1xuXHRcdFx0XHRcdGlmIChhbmd1bGFyLmlzQXJyYXkocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRpZihwcm9wZXJ0eS52YWx1ZS5qb2luKCc7JykuaW5kZXhPZignLCcpICE9PSAtMSkge1xuXHRcdFx0XHRcdFx0XHR0aGlzLmZhaWxlZFByb3BzLnB1c2gocHJvcCk7XG5cdFx0XHRcdFx0XHRcdHByb3BlcnR5LnZhbHVlID0gcHJvcGVydHkudmFsdWUuam9pbignLCcpLnNwbGl0KCcsJyk7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS53YXJuKHRoaXMudWlkKCkrJzogQ2F0ZWdvcmllcyBzcGxpdDogJyArIHByb3BlcnR5LnZhbHVlKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFuZ3VsYXIuaXNTdHJpbmcocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHRpZihwcm9wZXJ0eS52YWx1ZS5pbmRleE9mKCcsJykgIT09IC0xKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuZmFpbGVkUHJvcHMucHVzaChwcm9wKTtcblx0XHRcdFx0XHRcdFx0cHJvcGVydHkudmFsdWUgPSBwcm9wZXJ0eS52YWx1ZS5zcGxpdCgnLCcpO1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUud2Fybih0aGlzLnVpZCgpKyc6IENhdGVnb3JpZXMgc3BsaXQ6ICcgKyBwcm9wZXJ0eS52YWx1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIFJlbW92ZSBkdXBsaWNhdGUgY2F0ZWdvcmllcyBvbiBhcnJheVxuXHRcdFx0XHRcdGlmKHByb3BlcnR5LnZhbHVlLmxlbmd0aCAhPT0gMCAmJiBhbmd1bGFyLmlzQXJyYXkocHJvcGVydHkudmFsdWUpKSB7XG5cdFx0XHRcdFx0XHR2YXIgdW5pcXVlQ2F0ZWdvcmllcyA9IF8udW5pcXVlKHByb3BlcnR5LnZhbHVlKTtcblx0XHRcdFx0XHRcdGlmKCFhbmd1bGFyLmVxdWFscyh1bmlxdWVDYXRlZ29yaWVzLCBwcm9wZXJ0eS52YWx1ZSkpIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5mYWlsZWRQcm9wcy5wdXNoKHByb3ApO1xuXHRcdFx0XHRcdFx0XHRwcm9wZXJ0eS52YWx1ZSA9IHVuaXF1ZUNhdGVnb3JpZXM7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS53YXJuKHRoaXMudWlkKCkrJzogQ2F0ZWdvcmllcyBkdXBsaWNhdGU6ICcgKyBwcm9wZXJ0eS52YWx1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdwaG90byc6XG5cdFx0XHRcdFx0Ly8gQXZvaWQgdW5kZWZpbmVkIHBob3RvIHR5cGVcblx0XHRcdFx0XHRpZiAoYW5ndWxhci5pc0RlZmluZWQocHJvcGVydHkpKSB7XG5cdFx0XHRcdFx0XHRpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChwcm9wZXJ0eS5tZXRhLnR5cGUpKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBtaW1lID0gTWltZVNlcnZpY2UuYjY0bWltZShwcm9wZXJ0eS52YWx1ZSk7XG5cdFx0XHRcdFx0XHRcdGlmIChtaW1lKSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5mYWlsZWRQcm9wcy5wdXNoKHByb3ApO1xuXHRcdFx0XHRcdFx0XHRcdHByb3BlcnR5Lm1ldGEudHlwZT1bbWltZV07XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zZXRQcm9wZXJ0eSgncGhvdG8nLCB7XG5cdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZTpwcm9wZXJ0eS52YWx1ZSxcblx0XHRcdFx0XHRcdFx0XHRcdG1ldGE6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZTpwcm9wZXJ0eS5tZXRhLnR5cGUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGVuY29kaW5nOnByb3BlcnR5Lm1ldGEuZW5jb2Rpbmdcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLndhcm4odGhpcy51aWQoKSsnOiBQaG90byBkZXRlY3RlZCBhcyAnICsgcHJvcGVydHkubWV0YS50eXBlKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmZhaWxlZFByb3BzLnB1c2gocHJvcCk7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5yZW1vdmVQcm9wZXJ0eSgncGhvdG8nLCBwcm9wZXJ0eSk7XG5cdFx0XHRcdFx0XHRcdFx0cHJvcGVydHkgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKHRoaXMudWlkKCkrJzogUGhvdG8gcmVtb3ZlZCcpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBwcm9wZXJ0eTtcblx0XHRcdH0sXG5cdFx0XHQvKiBlc2xpbnQtZW5hYmxlIG5vLWNvbnNvbGUgKi9cblxuXHRcdFx0Zml4OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy52YWxpZGF0ZSgncmV2Jyk7XG5cdFx0XHRcdHRoaXMudmFsaWRhdGUoJ3ZlcnNpb24nKTtcblx0XHRcdFx0dGhpcy52YWxpZGF0ZSgncHJvZGlkJyk7XG5cdFx0XHRcdHJldHVybiB0aGlzLmZhaWxlZFByb3BzLmluZGV4T2YoJ3JldicpICE9PSAtMVxuXHRcdFx0XHRcdHx8IHRoaXMuZmFpbGVkUHJvcHMuaW5kZXhPZigncHJvZGlkJykgIT09IC0xXG5cdFx0XHRcdFx0fHwgdGhpcy5mYWlsZWRQcm9wcy5pbmRleE9mKCd2ZXJzaW9uJykgIT09IC0xO1xuXHRcdFx0fVxuXG5cdFx0fSk7XG5cblx0XHRpZihhbmd1bGFyLmlzRGVmaW5lZCh2Q2FyZCkpIHtcblx0XHRcdGFuZ3VsYXIuZXh0ZW5kKHRoaXMuZGF0YSwgdkNhcmQpO1xuXHRcdFx0YW5ndWxhci5leHRlbmQodGhpcy5wcm9wcywgJGZpbHRlcigndkNhcmQySlNPTicpKHRoaXMuZGF0YS5hZGRyZXNzRGF0YSkpO1xuXHRcdFx0Ly8gV2UgZG8gbm90IHdhbnQgdG8gc3RvcmUgb3VyIGFkZHJlc3Nib29rIHdpdGhpbiBjb250YWN0c1xuXHRcdFx0ZGVsZXRlIHRoaXMuZGF0YS5hZGRyZXNzQm9vaztcblx0XHR9IGVsc2Uge1xuXHRcdFx0YW5ndWxhci5leHRlbmQodGhpcy5wcm9wcywge1xuXHRcdFx0XHR2ZXJzaW9uOiBbe3ZhbHVlOiAnMy4wJ31dLFxuXHRcdFx0XHRmbjogW3t2YWx1ZTogdCgnY29udGFjdHMnLCAnTmV3IGNvbnRhY3QnKX1dXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuZGF0YS5hZGRyZXNzRGF0YSA9ICRmaWx0ZXIoJ0pTT04ydkNhcmQnKSh0aGlzLnByb3BzKTtcblx0XHR9XG5cblx0XHR2YXIgcHJvcGVydHkgPSB0aGlzLmdldFByb3BlcnR5KCdjYXRlZ29yaWVzJyk7XG5cdFx0aWYoIXByb3BlcnR5KSB7XG5cdFx0XHQvLyBjYXRlZ29yaWVzIHNob3VsZCBhbHdheXMgaGF2ZSB0aGUgc2FtZSB0eXBlIChhbiBhcnJheSlcblx0XHRcdHRoaXMuY2F0ZWdvcmllcyhbXSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChhbmd1bGFyLmlzU3RyaW5nKHByb3BlcnR5LnZhbHVlKSkge1xuXHRcdFx0XHR0aGlzLmNhdGVnb3JpZXMoW3Byb3BlcnR5LnZhbHVlXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuXHQuZmFjdG9yeSgnR3JvdXAnLCBmdW5jdGlvbigpXG5cdHtcblx0XHRyZXR1cm4gZnVuY3Rpb24gR3JvdXAoZGF0YSkge1xuXHRcdFx0YW5ndWxhci5leHRlbmQodGhpcywge1xuXHRcdFx0XHRuYW1lOiAnJyxcblx0XHRcdFx0Y291bnQ6IDBcblx0XHRcdH0pO1xuXG5cdFx0XHRhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhKTtcblx0XHR9O1xuXHR9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmFjdG9yeSgnQWRkcmVzc0Jvb2tTZXJ2aWNlJywgZnVuY3Rpb24oRGF2Q2xpZW50LCBEYXZTZXJ2aWNlLCBTZXR0aW5nc1NlcnZpY2UsIEFkZHJlc3NCb29rLCAkcSkge1xuXG5cdHZhciBhZGRyZXNzQm9va3MgPSBbXTtcblx0dmFyIGxvYWRQcm9taXNlID0gdW5kZWZpbmVkO1xuXG5cdHZhciBvYnNlcnZlckNhbGxiYWNrcyA9IFtdO1xuXG5cdHZhciBub3RpZnlPYnNlcnZlcnMgPSBmdW5jdGlvbihldmVudE5hbWUsIGFkZHJlc3NCb29rKSB7XG5cdFx0dmFyIGV2ID0ge1xuXHRcdFx0ZXZlbnQ6IGV2ZW50TmFtZSxcblx0XHRcdGFkZHJlc3NCb29rczogYWRkcmVzc0Jvb2tzLFxuXHRcdFx0YWRkcmVzc0Jvb2s6IGFkZHJlc3NCb29rLFxuXHRcdH07XG5cdFx0YW5ndWxhci5mb3JFYWNoKG9ic2VydmVyQ2FsbGJhY2tzLCBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdFx0Y2FsbGJhY2soZXYpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHZhciBsb2FkQWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGFkZHJlc3NCb29rcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRyZXR1cm4gJHEud2hlbihhZGRyZXNzQm9va3MpO1xuXHRcdH1cblx0XHRpZiAoXy5pc1VuZGVmaW5lZChsb2FkUHJvbWlzZSkpIHtcblx0XHRcdGxvYWRQcm9taXNlID0gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKGFjY291bnQpIHtcblx0XHRcdFx0bG9hZFByb21pc2UgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGFkZHJlc3NCb29rcyA9IGFjY291bnQuYWRkcmVzc0Jvb2tzLm1hcChmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgQWRkcmVzc0Jvb2soYWRkcmVzc0Jvb2spO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gbG9hZFByb21pc2U7XG5cdH07XG5cblx0cmV0dXJuIHtcblx0XHRyZWdpc3Rlck9ic2VydmVyQ2FsbGJhY2s6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHRvYnNlcnZlckNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcblx0XHR9LFxuXG5cdFx0Z2V0QWxsOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBsb2FkQWxsKCkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rcztcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRnZXRHcm91cHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0QWxsKCkudGhlbihmdW5jdGlvbihhZGRyZXNzQm9va3MpIHtcblx0XHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rcy5tYXAoZnVuY3Rpb24gKGVsZW1lbnQpIHtcblx0XHRcdFx0XHRyZXR1cm4gZWxlbWVudC5ncm91cHM7XG5cdFx0XHRcdH0pLnJlZHVjZShmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGEuY29uY2F0KGIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRnZXREZWZhdWx0QWRkcmVzc0Jvb2s6IGZ1bmN0aW9uKHRocm93T0MpIHtcblx0XHRcdHZhciBpID0gYWRkcmVzc0Jvb2tzLmZpbmRJbmRleChmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2suZW5hYmxlZCAmJiAhYWRkcmVzc0Jvb2sucmVhZE9ubHk7XG5cdFx0XHR9KTtcblx0XHRcdGlmIChpICE9PSAtMSkge1xuXHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2tzW2ldO1xuXHRcdFx0fSBlbHNlIGlmKHRocm93T0MpIHtcblx0XHRcdFx0T0MuTm90aWZpY2F0aW9uLnNob3dUZW1wb3JhcnkodCgnY29udGFjdHMnLCAnVGhlcmUgaXMgbm8gYWRkcmVzcyBib29rIGF2YWlsYWJsZSB0byBjcmVhdGUgYSBjb250YWN0LicpKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LFxuXG5cdFx0Z2V0QWRkcmVzc0Jvb2s6IGZ1bmN0aW9uKGRpc3BsYXlOYW1lKSB7XG5cdFx0XHRyZXR1cm4gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKGFjY291bnQpIHtcblx0XHRcdFx0cmV0dXJuIERhdkNsaWVudC5nZXRBZGRyZXNzQm9vayh7ZGlzcGxheU5hbWU6ZGlzcGxheU5hbWUsIHVybDphY2NvdW50LmhvbWVVcmx9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuXHRcdFx0XHRcdHZhciBhZGRyZXNzQm9vayA9IG5ldyBBZGRyZXNzQm9vayh7XG5cdFx0XHRcdFx0XHRhY2NvdW50OiBhY2NvdW50LFxuXHRcdFx0XHRcdFx0Y3RhZzogcmVzWzBdLnByb3BzLmdldGN0YWcsXG5cdFx0XHRcdFx0XHR1cmw6IGFjY291bnQuaG9tZVVybCtkaXNwbGF5TmFtZSsnLycsXG5cdFx0XHRcdFx0XHRkYXRhOiByZXNbMF0sXG5cdFx0XHRcdFx0XHRkaXNwbGF5TmFtZTogcmVzWzBdLnByb3BzLmRpc3BsYXluYW1lLFxuXHRcdFx0XHRcdFx0cmVzb3VyY2V0eXBlOiByZXNbMF0ucHJvcHMucmVzb3VyY2V0eXBlLFxuXHRcdFx0XHRcdFx0c3luY1Rva2VuOiByZXNbMF0ucHJvcHMuc3luY1Rva2VuXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdjcmVhdGUnLCBhZGRyZXNzQm9vayk7XG5cdFx0XHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRjcmVhdGU6IGZ1bmN0aW9uKGRpc3BsYXlOYW1lKSB7XG5cdFx0XHRyZXR1cm4gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKGFjY291bnQpIHtcblx0XHRcdFx0cmV0dXJuIERhdkNsaWVudC5jcmVhdGVBZGRyZXNzQm9vayh7ZGlzcGxheU5hbWU6ZGlzcGxheU5hbWUsIHVybDphY2NvdW50LmhvbWVVcmx9KTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRkZWxldGU6IGZ1bmN0aW9uKGFkZHJlc3NCb29rKSB7XG5cdFx0XHRyZXR1cm4gRGF2U2VydmljZS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gRGF2Q2xpZW50LmRlbGV0ZUFkZHJlc3NCb29rKGFkZHJlc3NCb29rKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciBpbmRleCA9IGFkZHJlc3NCb29rcy5pbmRleE9mKGFkZHJlc3NCb29rKTtcblx0XHRcdFx0XHRhZGRyZXNzQm9va3Muc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFx0XHRub3RpZnlPYnNlcnZlcnMoJ2RlbGV0ZScsIGFkZHJlc3NCb29rKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0cmVuYW1lOiBmdW5jdGlvbihhZGRyZXNzQm9vaywgZGlzcGxheU5hbWUpIHtcblx0XHRcdHJldHVybiBEYXZTZXJ2aWNlLnRoZW4oZnVuY3Rpb24oYWNjb3VudCkge1xuXHRcdFx0XHRyZXR1cm4gRGF2Q2xpZW50LnJlbmFtZUFkZHJlc3NCb29rKGFkZHJlc3NCb29rLCB7ZGlzcGxheU5hbWU6ZGlzcGxheU5hbWUsIHVybDphY2NvdW50LmhvbWVVcmx9KTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRnZXQ6IGZ1bmN0aW9uKGRpc3BsYXlOYW1lKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rcykge1xuXHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2tzLmZpbHRlcihmdW5jdGlvbiAoZWxlbWVudCkge1xuXHRcdFx0XHRcdHJldHVybiBlbGVtZW50LmRpc3BsYXlOYW1lID09PSBkaXNwbGF5TmFtZTtcblx0XHRcdFx0fSlbMF07XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0c3luYzogZnVuY3Rpb24oYWRkcmVzc0Jvb2spIHtcblx0XHRcdHJldHVybiBEYXZDbGllbnQuc3luY0FkZHJlc3NCb29rKGFkZHJlc3NCb29rKTtcblx0XHR9LFxuXG5cdFx0YWRkQ29udGFjdDogZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIGNvbnRhY3QpIHtcblx0XHRcdC8vIFdlIGRvbid0IHdhbnQgdG8gYWRkIHRoZSBzYW1lIGNvbnRhY3QgYWdhaW5cblx0XHRcdGlmIChhZGRyZXNzQm9vay5jb250YWN0cy5pbmRleE9mKGNvbnRhY3QpID09PSAtMSkge1xuXHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2suY29udGFjdHMucHVzaChjb250YWN0KTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0cmVtb3ZlQ29udGFjdDogZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIGNvbnRhY3QpIHtcblx0XHRcdC8vIFdlIGNhbid0IHJlbW92ZSBhbiB1bmRlZmluZWQgb2JqZWN0XG5cdFx0XHRpZiAoYWRkcmVzc0Jvb2suY29udGFjdHMuaW5kZXhPZihjb250YWN0KSAhPT0gLTEpIHtcblx0XHRcdFx0cmV0dXJuIGFkZHJlc3NCb29rLmNvbnRhY3RzLnNwbGljZShhZGRyZXNzQm9vay5jb250YWN0cy5pbmRleE9mKGNvbnRhY3QpLCAxKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0dG9nZ2xlU3RhdGU6IGZ1bmN0aW9uKGFkZHJlc3NCb29rKSB7XG5cdFx0XHR2YXIgeG1sRG9jID0gZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlRG9jdW1lbnQoJycsICcnLCBudWxsKTtcblx0XHRcdHZhciBkUHJvcFVwZGF0ZSA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdkOnByb3BlcnR5dXBkYXRlJyk7XG5cdFx0XHRkUHJvcFVwZGF0ZS5zZXRBdHRyaWJ1dGUoJ3htbG5zOmQnLCAnREFWOicpO1xuXHRcdFx0ZFByb3BVcGRhdGUuc2V0QXR0cmlidXRlKCd4bWxuczpvJywgJ2h0dHA6Ly9vd25jbG91ZC5vcmcvbnMnKTtcblx0XHRcdHhtbERvYy5hcHBlbmRDaGlsZChkUHJvcFVwZGF0ZSk7XG5cblx0XHRcdHZhciBkU2V0ID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoJ2Q6c2V0Jyk7XG5cdFx0XHRkUHJvcFVwZGF0ZS5hcHBlbmRDaGlsZChkU2V0KTtcblxuXHRcdFx0dmFyIGRQcm9wID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoJ2Q6cHJvcCcpO1xuXHRcdFx0ZFNldC5hcHBlbmRDaGlsZChkUHJvcCk7XG5cblx0XHRcdHZhciBvRW5hYmxlZCA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdvOmVuYWJsZWQnKTtcblx0XHRcdC8vIFJldmVydCBzdGF0ZSB0byB0b2dnbGVcblx0XHRcdG9FbmFibGVkLnRleHRDb250ZW50ID0gIWFkZHJlc3NCb29rLmVuYWJsZWQgPyAnMScgOiAnMCc7XG5cdFx0XHRkUHJvcC5hcHBlbmRDaGlsZChvRW5hYmxlZCk7XG5cblx0XHRcdHZhciBib2R5ID0gZFByb3BVcGRhdGUub3V0ZXJIVE1MO1xuXG5cdFx0XHRyZXR1cm4gRGF2Q2xpZW50Lnhoci5zZW5kKFxuXHRcdFx0XHRkYXYucmVxdWVzdC5iYXNpYyh7bWV0aG9kOiAnUFJPUFBBVENIJywgZGF0YTogYm9keX0pLFxuXHRcdFx0XHRhZGRyZXNzQm9vay51cmxcblx0XHRcdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDcpIHtcblx0XHRcdFx0XHRhZGRyZXNzQm9vay5lbmFibGVkID0gIWFkZHJlc3NCb29rLmVuYWJsZWQ7XG5cdFx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKFxuXHRcdFx0XHRcdFx0YWRkcmVzc0Jvb2suZW5hYmxlZCA/ICdlbmFibGUnIDogJ2Rpc2FibGUnLFxuXHRcdFx0XHRcdFx0YWRkcmVzc0Jvb2tcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBhZGRyZXNzQm9vaztcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRzaGFyZTogZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIHNoYXJlVHlwZSwgc2hhcmVXaXRoLCB3cml0YWJsZSwgZXhpc3RpbmdTaGFyZSkge1xuXHRcdFx0dmFyIHhtbERvYyA9IGRvY3VtZW50LmltcGxlbWVudGF0aW9uLmNyZWF0ZURvY3VtZW50KCcnLCAnJywgbnVsbCk7XG5cdFx0XHR2YXIgb1NoYXJlID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoJ286c2hhcmUnKTtcblx0XHRcdG9TaGFyZS5zZXRBdHRyaWJ1dGUoJ3htbG5zOmQnLCAnREFWOicpO1xuXHRcdFx0b1NoYXJlLnNldEF0dHJpYnV0ZSgneG1sbnM6bycsICdodHRwOi8vb3duY2xvdWQub3JnL25zJyk7XG5cdFx0XHR4bWxEb2MuYXBwZW5kQ2hpbGQob1NoYXJlKTtcblxuXHRcdFx0dmFyIG9TZXQgPSB4bWxEb2MuY3JlYXRlRWxlbWVudCgnbzpzZXQnKTtcblx0XHRcdG9TaGFyZS5hcHBlbmRDaGlsZChvU2V0KTtcblxuXHRcdFx0dmFyIGRIcmVmID0geG1sRG9jLmNyZWF0ZUVsZW1lbnQoJ2Q6aHJlZicpO1xuXHRcdFx0aWYgKHNoYXJlVHlwZSA9PT0gT0MuU2hhcmUuU0hBUkVfVFlQRV9VU0VSKSB7XG5cdFx0XHRcdGRIcmVmLnRleHRDb250ZW50ID0gJ3ByaW5jaXBhbDpwcmluY2lwYWxzL3VzZXJzLyc7XG5cdFx0XHR9IGVsc2UgaWYgKHNoYXJlVHlwZSA9PT0gT0MuU2hhcmUuU0hBUkVfVFlQRV9HUk9VUCkge1xuXHRcdFx0XHRkSHJlZi50ZXh0Q29udGVudCA9ICdwcmluY2lwYWw6cHJpbmNpcGFscy9ncm91cHMvJztcblx0XHRcdH1cblx0XHRcdGRIcmVmLnRleHRDb250ZW50ICs9IHNoYXJlV2l0aDtcblx0XHRcdG9TZXQuYXBwZW5kQ2hpbGQoZEhyZWYpO1xuXG5cdFx0XHR2YXIgb1N1bW1hcnkgPSB4bWxEb2MuY3JlYXRlRWxlbWVudCgnbzpzdW1tYXJ5Jyk7XG5cdFx0XHRvU3VtbWFyeS50ZXh0Q29udGVudCA9IHQoJ2NvbnRhY3RzJywgJ3thZGRyZXNzYm9va30gc2hhcmVkIGJ5IHtvd25lcn0nLCB7XG5cdFx0XHRcdGFkZHJlc3Nib29rOiBhZGRyZXNzQm9vay5kaXNwbGF5TmFtZSxcblx0XHRcdFx0b3duZXI6IGFkZHJlc3NCb29rLm93bmVyXG5cdFx0XHR9KTtcblx0XHRcdG9TZXQuYXBwZW5kQ2hpbGQob1N1bW1hcnkpO1xuXG5cdFx0XHRpZiAod3JpdGFibGUpIHtcblx0XHRcdFx0dmFyIG9SVyA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdvOnJlYWQtd3JpdGUnKTtcblx0XHRcdFx0b1NldC5hcHBlbmRDaGlsZChvUlcpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgYm9keSA9IG9TaGFyZS5vdXRlckhUTUw7XG5cblx0XHRcdHJldHVybiBEYXZDbGllbnQueGhyLnNlbmQoXG5cdFx0XHRcdGRhdi5yZXF1ZXN0LmJhc2ljKHttZXRob2Q6ICdQT1NUJywgZGF0YTogYm9keX0pLFxuXHRcdFx0XHRhZGRyZXNzQm9vay51cmxcblx0XHRcdCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApIHtcblx0XHRcdFx0XHRpZiAoIWV4aXN0aW5nU2hhcmUpIHtcblx0XHRcdFx0XHRcdGlmIChzaGFyZVR5cGUgPT09IE9DLlNoYXJlLlNIQVJFX1RZUEVfVVNFUikge1xuXHRcdFx0XHRcdFx0XHRhZGRyZXNzQm9vay5zaGFyZWRXaXRoLnVzZXJzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdGlkOiBzaGFyZVdpdGgsXG5cdFx0XHRcdFx0XHRcdFx0ZGlzcGxheW5hbWU6IHNoYXJlV2l0aCxcblx0XHRcdFx0XHRcdFx0XHR3cml0YWJsZTogd3JpdGFibGVcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHNoYXJlVHlwZSA9PT0gT0MuU2hhcmUuU0hBUkVfVFlQRV9HUk9VUCkge1xuXHRcdFx0XHRcdFx0XHRhZGRyZXNzQm9vay5zaGFyZWRXaXRoLmdyb3Vwcy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0XHRpZDogc2hhcmVXaXRoLFxuXHRcdFx0XHRcdFx0XHRcdGRpc3BsYXluYW1lOiBzaGFyZVdpdGgsXG5cdFx0XHRcdFx0XHRcdFx0d3JpdGFibGU6IHdyaXRhYmxlXG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHR9LFxuXG5cdFx0dW5zaGFyZTogZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIHNoYXJlVHlwZSwgc2hhcmVXaXRoKSB7XG5cdFx0XHR2YXIgeG1sRG9jID0gZG9jdW1lbnQuaW1wbGVtZW50YXRpb24uY3JlYXRlRG9jdW1lbnQoJycsICcnLCBudWxsKTtcblx0XHRcdHZhciBvU2hhcmUgPSB4bWxEb2MuY3JlYXRlRWxlbWVudCgnbzpzaGFyZScpO1xuXHRcdFx0b1NoYXJlLnNldEF0dHJpYnV0ZSgneG1sbnM6ZCcsICdEQVY6Jyk7XG5cdFx0XHRvU2hhcmUuc2V0QXR0cmlidXRlKCd4bWxuczpvJywgJ2h0dHA6Ly9vd25jbG91ZC5vcmcvbnMnKTtcblx0XHRcdHhtbERvYy5hcHBlbmRDaGlsZChvU2hhcmUpO1xuXG5cdFx0XHR2YXIgb1JlbW92ZSA9IHhtbERvYy5jcmVhdGVFbGVtZW50KCdvOnJlbW92ZScpO1xuXHRcdFx0b1NoYXJlLmFwcGVuZENoaWxkKG9SZW1vdmUpO1xuXG5cdFx0XHR2YXIgZEhyZWYgPSB4bWxEb2MuY3JlYXRlRWxlbWVudCgnZDpocmVmJyk7XG5cdFx0XHRpZiAoc2hhcmVUeXBlID09PSBPQy5TaGFyZS5TSEFSRV9UWVBFX1VTRVIpIHtcblx0XHRcdFx0ZEhyZWYudGV4dENvbnRlbnQgPSAncHJpbmNpcGFsOnByaW5jaXBhbHMvdXNlcnMvJztcblx0XHRcdH0gZWxzZSBpZiAoc2hhcmVUeXBlID09PSBPQy5TaGFyZS5TSEFSRV9UWVBFX0dST1VQKSB7XG5cdFx0XHRcdGRIcmVmLnRleHRDb250ZW50ID0gJ3ByaW5jaXBhbDpwcmluY2lwYWxzL2dyb3Vwcy8nO1xuXHRcdFx0fVxuXHRcdFx0ZEhyZWYudGV4dENvbnRlbnQgKz0gc2hhcmVXaXRoO1xuXHRcdFx0b1JlbW92ZS5hcHBlbmRDaGlsZChkSHJlZik7XG5cdFx0XHR2YXIgYm9keSA9IG9TaGFyZS5vdXRlckhUTUw7XG5cblxuXHRcdFx0cmV0dXJuIERhdkNsaWVudC54aHIuc2VuZChcblx0XHRcdFx0ZGF2LnJlcXVlc3QuYmFzaWMoe21ldGhvZDogJ1BPU1QnLCBkYXRhOiBib2R5fSksXG5cdFx0XHRcdGFkZHJlc3NCb29rLnVybFxuXHRcdFx0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwMCkge1xuXHRcdFx0XHRcdGlmIChzaGFyZVR5cGUgPT09IE9DLlNoYXJlLlNIQVJFX1RZUEVfVVNFUikge1xuXHRcdFx0XHRcdFx0YWRkcmVzc0Jvb2suc2hhcmVkV2l0aC51c2VycyA9IGFkZHJlc3NCb29rLnNoYXJlZFdpdGgudXNlcnMuZmlsdGVyKGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHVzZXIuaWQgIT09IHNoYXJlV2l0aDtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc2hhcmVUeXBlID09PSBPQy5TaGFyZS5TSEFSRV9UWVBFX0dST1VQKSB7XG5cdFx0XHRcdFx0XHRhZGRyZXNzQm9vay5zaGFyZWRXaXRoLmdyb3VwcyA9IGFkZHJlc3NCb29rLnNoYXJlZFdpdGguZ3JvdXBzLmZpbHRlcihmdW5jdGlvbihncm91cHMpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGdyb3Vwcy5pZCAhPT0gc2hhcmVXaXRoO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vdG9kbyAtIHJlbW92ZSBlbnRyeSBmcm9tIGFkZHJlc3Nib29rIG9iamVjdFxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHR9XG5cblxuXHR9O1xuXG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uc2VydmljZSgnQ29udGFjdFNlcnZpY2UnLCBmdW5jdGlvbihEYXZDbGllbnQsIEFkZHJlc3NCb29rU2VydmljZSwgQ29udGFjdCwgR3JvdXAsIENvbnRhY3RGaWx0ZXIsICRxLCBDYWNoZUZhY3RvcnksIHV1aWQ0KSB7XG5cblx0dmFyIGNvbnRhY3RTZXJ2aWNlID0gdGhpcztcblxuXHR2YXIgY2FjaGVGaWxsZWQgPSBmYWxzZTtcblx0dmFyIGNvbnRhY3RzQ2FjaGUgPSBDYWNoZUZhY3RvcnkoJ2NvbnRhY3RzJyk7XG5cdHZhciBvYnNlcnZlckNhbGxiYWNrcyA9IFtdO1xuXHR2YXIgbG9hZFByb21pc2UgPSB1bmRlZmluZWQ7XG5cblx0dmFyIGFsbFVwZGF0ZXMgPSAkcS53aGVuKCk7XG5cdHRoaXMucXVldWVVcGRhdGUgPSBmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0YWxsVXBkYXRlcyA9IGFsbFVwZGF0ZXMudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBjb250YWN0U2VydmljZS51cGRhdGUoY29udGFjdCk7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5yZWdpc3Rlck9ic2VydmVyQ2FsbGJhY2sgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdG9ic2VydmVyQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuXHR9O1xuXG5cdHZhciBub3RpZnlPYnNlcnZlcnMgPSBmdW5jdGlvbihldmVudE5hbWUsIHVpZCkge1xuXHRcdHZhciBldiA9IHtcblx0XHRcdGV2ZW50OiBldmVudE5hbWUsXG5cdFx0XHR1aWQ6IHVpZCxcblx0XHRcdGNvbnRhY3RzOiBjb250YWN0c0NhY2hlLnZhbHVlcygpXG5cdFx0fTtcblx0XHRhbmd1bGFyLmZvckVhY2gob2JzZXJ2ZXJDYWxsYmFja3MsIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHRjYWxsYmFjayhldik7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5nZXRGdWxsQ29udGFjdHMgPSBmdW5jdGlvbihjb250YWN0cykge1xuXHRcdEFkZHJlc3NCb29rU2VydmljZS5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rcykge1xuXHRcdFx0dmFyIHByb21pc2VzID0gW107XG5cdFx0XHR2YXIgeGhyQWRkcmVzc0Jvb2tzID0gW107XG5cdFx0XHRjb250YWN0cy5mb3JFYWNoKGZ1bmN0aW9uKGNvbnRhY3QpIHtcblx0XHRcdFx0Ly8gUmVncm91cCB1cmxzIGJ5IGFkZHJlc3Nib29rc1xuXHRcdFx0XHRpZihhZGRyZXNzQm9va3MuaW5kZXhPZihjb250YWN0LmFkZHJlc3NCb29rKSAhPT0gLTEpIHtcblx0XHRcdFx0XHQvLyBJbml0aWF0ZSBhcnJheSBpZiBubyBleGlzdHNcblx0XHRcdFx0XHR4aHJBZGRyZXNzQm9va3NbY29udGFjdC5hZGRyZXNzQm9va0lkXSA9IHhockFkZHJlc3NCb29rc1tjb250YWN0LmFkZHJlc3NCb29rSWRdIHx8IFtdO1xuXHRcdFx0XHRcdHhockFkZHJlc3NCb29rc1tjb250YWN0LmFkZHJlc3NCb29rSWRdLnB1c2goY29udGFjdC5kYXRhLnVybCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0Ly8gR2V0IG91ciBmdWxsIHZDYXJkc1xuXHRcdFx0YWRkcmVzc0Jvb2tzLmZvckVhY2goZnVuY3Rpb24oYWRkcmVzc0Jvb2spIHtcblx0XHRcdFx0Ly8gT25seSBnbyB0aHJvdWdoIGVuYWJsZWQgYWRkcmVzc2Jvb2tzXG5cdFx0XHRcdC8vIFRob3VnaCB4aHJBZGRyZXNzQm9va3MgZG9lcyBub3QgY29udGFpbnMgY29udGFjdHMgZnJvbSBkaXNhYmxlZCBvbmVzXG5cdFx0XHRcdGlmKGFkZHJlc3NCb29rLmVuYWJsZWQpIHtcblx0XHRcdFx0XHRpZihhbmd1bGFyLmlzQXJyYXkoeGhyQWRkcmVzc0Jvb2tzW2FkZHJlc3NCb29rLmRpc3BsYXlOYW1lXSkpIHtcblx0XHRcdFx0XHRcdHZhciBwcm9taXNlID0gRGF2Q2xpZW50LmdldENvbnRhY3RzKGFkZHJlc3NCb29rLCB7fSwgeGhyQWRkcmVzc0Jvb2tzW2FkZHJlc3NCb29rLmRpc3BsYXlOYW1lXSkudGhlbihcblx0XHRcdFx0XHRcdFx0ZnVuY3Rpb24odmNhcmRzKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHZjYXJkcy5tYXAoZnVuY3Rpb24odmNhcmQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBuZXcgQ29udGFjdChhZGRyZXNzQm9vaywgdmNhcmQpO1xuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9KS50aGVuKGZ1bmN0aW9uKGNvbnRhY3RzXykge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRhY3RzXy5tYXAoZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gVmFsaWRhdGUgc29tZSBmaWVsZHNcblx0XHRcdFx0XHRcdFx0XHRcdGlmKGNvbnRhY3QuZml4KCkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQ2FuJ3QgdXNlIGB0aGlzYCBpbiB0aG9zZSBuZXN0ZWQgZnVuY3Rpb25zXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnRhY3RTZXJ2aWNlLnVwZGF0ZShjb250YWN0KTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGNvbnRhY3RzQ2FjaGUucHV0KGNvbnRhY3QudWlkKCksIGNvbnRhY3QpO1xuXHRcdFx0XHRcdFx0XHRcdFx0YWRkcmVzc0Jvb2suY29udGFjdHMucHVzaChjb250YWN0KTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRwcm9taXNlcy5wdXNoKHByb21pc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQkcS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdG5vdGlmeU9ic2VydmVycygnZ2V0RnVsbENvbnRhY3RzJywgJycpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5maWxsQ2FjaGUgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoXy5pc1VuZGVmaW5lZChsb2FkUHJvbWlzZSkpIHtcblx0XHRcdGxvYWRQcm9taXNlID0gQWRkcmVzc0Jvb2tTZXJ2aWNlLmdldEFsbCgpLnRoZW4oZnVuY3Rpb24oYWRkcmVzc0Jvb2tzKSB7XG5cdFx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xuXHRcdFx0XHRhZGRyZXNzQm9va3MuZm9yRWFjaChmdW5jdGlvbihhZGRyZXNzQm9vaykge1xuXHRcdFx0XHRcdC8vIE9ubHkgZ28gdGhyb3VnaCBlbmFibGVkIGFkZHJlc3Nib29rc1xuXHRcdFx0XHRcdGlmKGFkZHJlc3NCb29rLmVuYWJsZWQpIHtcblx0XHRcdFx0XHRcdHByb21pc2VzLnB1c2goXG5cdFx0XHRcdFx0XHRcdEFkZHJlc3NCb29rU2VydmljZS5zeW5jKGFkZHJlc3NCb29rKS50aGVuKGZ1bmN0aW9uKGFkZHJlc3NCb29rKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGFjdFNlcnZpY2UuYXBwZW5kQ29udGFjdHNGcm9tQWRkcmVzc2Jvb2soYWRkcmVzc0Jvb2spO1xuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gJHEuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNhY2hlRmlsbGVkID0gdHJ1ZTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIGxvYWRQcm9taXNlO1xuXHR9O1xuXG5cdHRoaXMuZ2V0QWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYoY2FjaGVGaWxsZWQgPT09IGZhbHNlKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5maWxsQ2FjaGUoKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gY29udGFjdHNDYWNoZS52YWx1ZXMoKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gJHEud2hlbihjb250YWN0c0NhY2hlLnZhbHVlcygpKTtcblx0XHR9XG5cdH07XG5cblx0dGhpcy5nZXRDb250YWN0RmlsdGVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmdldEFsbCgpLnRoZW4oZnVuY3Rpb24oY29udGFjdHMpIHtcblx0XHRcdHZhciBhbGxDb250YWN0cyA9IG5ldyBDb250YWN0RmlsdGVyKHtcblx0XHRcdFx0bmFtZTogdCgnY29udGFjdHMnLCAnQWxsIGNvbnRhY3RzJyksXG5cdFx0XHRcdGNvdW50OiBjb250YWN0cy5sZW5ndGhcblx0XHRcdH0pO1xuXHRcdFx0dmFyIG5vdEdyb3VwZWQgPSBuZXcgQ29udGFjdEZpbHRlcih7XG5cdFx0XHRcdG5hbWU6IHQoJ2NvbnRhY3RzJywgJ05vdCBncm91cGVkJyksXG5cdFx0XHRcdGNvdW50OiBjb250YWN0cy5maWx0ZXIoXG5cdFx0XHRcdFx0ZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGNvbnRhY3QuY2F0ZWdvcmllcygpLmxlbmd0aCA9PT0gMDtcblx0XHRcdFx0XHR9KS5sZW5ndGhcblx0XHRcdH0pO1xuXHRcdFx0dmFyIGZpbHRlcnMgPSBbYWxsQ29udGFjdHNdO1xuXHRcdFx0Ly8gT25seSBoYXZlIE5vdCBHcm91cGVkIGlmIGF0IGxlYXN0IG9uZSBjb250YWN0IGluIGl0XG5cdFx0XHRpZihub3RHcm91cGVkLmNvdW50ICE9PSAwKSB7XG5cdFx0XHRcdGZpbHRlcnMucHVzaChub3RHcm91cGVkKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZpbHRlcnM7XG5cdFx0fSk7XG5cdH07XG5cblx0Ly8gZ2V0IGxpc3Qgb2YgZ3JvdXBzIGFuZCB0aGUgY291bnQgb2YgY29udGFjdHMgaW4gc2FpZCBncm91cHNcblx0dGhpcy5nZXRHcm91cExpc3QgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5nZXRBbGwoKS50aGVuKGZ1bmN0aW9uKGNvbnRhY3RzKSB7XG5cdFx0XHQvLyBhbGxvdyBncm91cHMgd2l0aCBuYW1lcyBzdWNoIGFzIHRvU3RyaW5nXG5cdFx0XHR2YXIgZ3JvdXBzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuXHRcdFx0Ly8gY29sbGVjdCBjYXRlZ29yaWVzIGFuZCB0aGVpciBhc3NvY2lhdGVkIGNvdW50c1xuXHRcdFx0Y29udGFjdHMuZm9yRWFjaChmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRcdGNvbnRhY3QuY2F0ZWdvcmllcygpLmZvckVhY2goZnVuY3Rpb24oY2F0ZWdvcnkpIHtcblx0XHRcdFx0XHRncm91cHNbY2F0ZWdvcnldID0gZ3JvdXBzW2NhdGVnb3J5XSA/IGdyb3Vwc1tjYXRlZ29yeV0gKyAxIDogMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBfLmtleXMoZ3JvdXBzKS5tYXAoXG5cdFx0XHRcdGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgR3JvdXAoe1xuXHRcdFx0XHRcdFx0bmFtZToga2V5LFxuXHRcdFx0XHRcdFx0Y291bnQ6IGdyb3Vwc1trZXldXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMuZ2V0R3JvdXBzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0QWxsKCkudGhlbihmdW5jdGlvbihjb250YWN0cykge1xuXHRcdFx0cmV0dXJuIF8udW5pcShjb250YWN0cy5tYXAoZnVuY3Rpb24oZWxlbWVudCkge1xuXHRcdFx0XHRyZXR1cm4gZWxlbWVudC5jYXRlZ29yaWVzKCk7XG5cdFx0XHR9KS5yZWR1Y2UoZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRyZXR1cm4gYS5jb25jYXQoYik7XG5cdFx0XHR9LCBbXSkuc29ydCgpLCB0cnVlKTtcblx0XHR9KTtcblx0fTtcblxuXHR0aGlzLmdldEJ5SWQgPSBmdW5jdGlvbihhZGRyZXNzQm9va3MsIHVpZCkge1xuXHRcdHJldHVybiAoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZihjYWNoZUZpbGxlZCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZmlsbENhY2hlKCkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gY29udGFjdHNDYWNoZS5nZXQodWlkKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gJHEud2hlbihjb250YWN0c0NhY2hlLmdldCh1aWQpKTtcblx0XHRcdH1cblx0XHR9KS5jYWxsKHRoaXMpXG5cdFx0XHQudGhlbihmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRcdGlmKGFuZ3VsYXIuaXNVbmRlZmluZWQoY29udGFjdCkpIHtcblx0XHRcdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdDb250YWN0IG5vdCBmb3VuZC4nKSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHZhciBhZGRyZXNzQm9vayA9IGFkZHJlc3NCb29rcy5maW5kKGZ1bmN0aW9uKGJvb2spIHtcblx0XHRcdFx0XHRcdHJldHVybiBib29rLmRpc3BsYXlOYW1lID09PSBjb250YWN0LmFkZHJlc3NCb29rSWQ7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0Ly8gRmV0Y2ggYW5kIHJldHVybiBmdWxsIGNvbnRhY3QgdmNhcmRcblx0XHRcdFx0XHRyZXR1cm4gYWRkcmVzc0Jvb2tcblx0XHRcdFx0XHRcdD8gRGF2Q2xpZW50LmdldENvbnRhY3RzKGFkZHJlc3NCb29rLCB7fSwgWyBjb250YWN0LmRhdGEudXJsIF0pLnRoZW4oZnVuY3Rpb24odmNhcmRzKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBuZXcgQ29udGFjdChhZGRyZXNzQm9vaywgdmNhcmRzWzBdKTtcblx0XHRcdFx0XHRcdH0pLnRoZW4oZnVuY3Rpb24obmV3Q29udGFjdCkge1xuXHRcdFx0XHRcdFx0XHRjb250YWN0c0NhY2hlLnB1dChjb250YWN0LnVpZCgpLCBuZXdDb250YWN0KTtcblx0XHRcdFx0XHRcdFx0dmFyIGNvbnRhY3RJbmRleCA9IGFkZHJlc3NCb29rLmNvbnRhY3RzLmZpbmRJbmRleChmdW5jdGlvbih0ZXN0ZWRDb250YWN0KSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRlc3RlZENvbnRhY3QudWlkKCkgPT09IGNvbnRhY3QudWlkKCk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRhZGRyZXNzQm9vay5jb250YWN0c1tjb250YWN0SW5kZXhdID0gbmV3Q29udGFjdDtcblx0XHRcdFx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdnZXRGdWxsQ29udGFjdHMnLCBjb250YWN0LnVpZCgpKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIG5ld0NvbnRhY3Q7XG5cdFx0XHRcdFx0XHR9KSA6IGNvbnRhY3Q7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMuY3JlYXRlID0gZnVuY3Rpb24obmV3Q29udGFjdCwgYWRkcmVzc0Jvb2ssIHVpZCwgZnJvbUltcG9ydCkge1xuXHRcdGFkZHJlc3NCb29rID0gYWRkcmVzc0Jvb2sgfHwgQWRkcmVzc0Jvb2tTZXJ2aWNlLmdldERlZmF1bHRBZGRyZXNzQm9vayh0cnVlKTtcblxuXHRcdC8vIE5vIGFkZHJlc3NCb29rIGF2YWlsYWJsZVxuXHRcdGlmKCFhZGRyZXNzQm9vaykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmKGFkZHJlc3NCb29rLnJlYWRPbmx5KSB7XG5cdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdZb3UgZG9uXFwndCBoYXZlIHBlcm1pc3Npb24gdG8gd3JpdGUgdG8gdGhpcyBhZGRyZXNzYm9vay4nKSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRuZXdDb250YWN0ID0gbmV3Q29udGFjdCB8fCBuZXcgQ29udGFjdChhZGRyZXNzQm9vayk7XG5cdFx0fSBjYXRjaChlcnJvcikge1xuXHRcdFx0T0MuTm90aWZpY2F0aW9uLnNob3dUZW1wb3JhcnkodCgnY29udGFjdHMnLCAnQ29udGFjdCBjb3VsZCBub3QgYmUgY3JlYXRlZC4nKSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBuZXdVaWQgPSAnJztcblx0XHRpZih1dWlkNC52YWxpZGF0ZSh1aWQpKSB7XG5cdFx0XHRuZXdVaWQgPSB1aWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG5ld1VpZCA9IHV1aWQ0LmdlbmVyYXRlKCk7XG5cdFx0fVxuXHRcdG5ld0NvbnRhY3QudWlkKG5ld1VpZCk7XG5cdFx0bmV3Q29udGFjdC5zZXRVcmwoYWRkcmVzc0Jvb2ssIG5ld1VpZCk7XG5cdFx0bmV3Q29udGFjdC5hZGRyZXNzQm9va0lkID0gYWRkcmVzc0Jvb2suZGlzcGxheU5hbWU7XG5cdFx0aWYgKF8uaXNVbmRlZmluZWQobmV3Q29udGFjdC5mdWxsTmFtZSgpKSB8fCBuZXdDb250YWN0LmZ1bGxOYW1lKCkgPT09ICcnKSB7XG5cdFx0XHRuZXdDb250YWN0LmZ1bGxOYW1lKG5ld0NvbnRhY3QuZGlzcGxheU5hbWUoKSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIERhdkNsaWVudC5jcmVhdGVDYXJkKFxuXHRcdFx0YWRkcmVzc0Jvb2ssXG5cdFx0XHR7XG5cdFx0XHRcdGRhdGE6IG5ld0NvbnRhY3QuZGF0YS5hZGRyZXNzRGF0YSxcblx0XHRcdFx0ZmlsZW5hbWU6IG5ld1VpZCArICcudmNmJ1xuXHRcdFx0fVxuXHRcdCkudGhlbihmdW5jdGlvbih4aHIpIHtcblx0XHRcdG5ld0NvbnRhY3Quc2V0RVRhZyh4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0VUYWcnKSk7XG5cdFx0XHRjb250YWN0c0NhY2hlLnB1dChuZXdVaWQsIG5ld0NvbnRhY3QpO1xuXHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmFkZENvbnRhY3QoYWRkcmVzc0Jvb2ssIG5ld0NvbnRhY3QpO1xuXHRcdFx0aWYgKGZyb21JbXBvcnQgIT09IHRydWUpIHtcblx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdjcmVhdGUnLCBuZXdVaWQpO1xuXHRcdFx0XHQkKCcjZGV0YWlscy1mdWxsTmFtZScpLnNlbGVjdCgpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG5ld0NvbnRhY3Q7XG5cdFx0fSkuY2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdDb250YWN0IGNvdWxkIG5vdCBiZSBjcmVhdGVkLicpKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fTtcblxuXHR0aGlzLmltcG9ydCA9IGZ1bmN0aW9uKGRhdGEsIHR5cGUsIGFkZHJlc3NCb29rLCBwcm9ncmVzc0NhbGxiYWNrKSB7XG5cdFx0YWRkcmVzc0Jvb2sgPSBhZGRyZXNzQm9vayB8fCBBZGRyZXNzQm9va1NlcnZpY2UuZ2V0RGVmYXVsdEFkZHJlc3NCb29rKHRydWUpO1xuXG5cdFx0Ly8gTm8gYWRkcmVzc0Jvb2sgYXZhaWxhYmxlXG5cdFx0aWYoIWFkZHJlc3NCb29rKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIHJlZ2V4cCA9IC9CRUdJTjpWQ0FSRFtcXHNcXFNdKj9FTkQ6VkNBUkQvbWdpO1xuXHRcdHZhciBzaW5nbGVWQ2FyZHMgPSBkYXRhLm1hdGNoKHJlZ2V4cCk7XG5cblx0XHRpZiAoIXNpbmdsZVZDYXJkcykge1xuXHRcdFx0T0MuTm90aWZpY2F0aW9uLnNob3dUZW1wb3JhcnkodCgnY29udGFjdHMnLCAnTm8gY29udGFjdHMgaW4gZmlsZS4gT25seSB2Q2FyZCBmaWxlcyBhcmUgYWxsb3dlZC4nKSk7XG5cdFx0XHRpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xuXHRcdFx0XHRwcm9ncmVzc0NhbGxiYWNrKDEpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdG5vdGlmeU9ic2VydmVycygnaW1wb3J0c3RhcnQnKTtcblxuXHRcdHZhciBudW0gPSAxO1xuXHRcdGZvcih2YXIgaSBpbiBzaW5nbGVWQ2FyZHMpIHtcblx0XHRcdHZhciBuZXdDb250YWN0ID0gbmV3IENvbnRhY3QoYWRkcmVzc0Jvb2ssIHthZGRyZXNzRGF0YTogc2luZ2xlVkNhcmRzW2ldfSk7XG5cdFx0XHRpZiAoWyczLjAnLCAnNC4wJ10uaW5kZXhPZihuZXdDb250YWN0LnZlcnNpb24oKSkgPCAwKSB7XG5cdFx0XHRcdGlmIChwcm9ncmVzc0NhbGxiYWNrKSB7XG5cdFx0XHRcdFx0cHJvZ3Jlc3NDYWxsYmFjayhudW0gLyBzaW5nbGVWQ2FyZHMubGVuZ3RoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdPbmx5IHZDYXJkIHZlcnNpb24gNC4wIChSRkM2MzUwKSBvciB2ZXJzaW9uIDMuMCAoUkZDMjQyNikgYXJlIHN1cHBvcnRlZC4nKSk7XG5cdFx0XHRcdG51bSsrO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcblx0XHRcdHRoaXMuY3JlYXRlKG5ld0NvbnRhY3QsIGFkZHJlc3NCb29rLCAnJywgdHJ1ZSkudGhlbihmdW5jdGlvbih4aHJDb250YWN0KSB7XG5cdFx0XHRcdGlmICh4aHJDb250YWN0ICE9PSBmYWxzZSkge1xuXHRcdFx0XHRcdHZhciB4aHJDb250YWN0TmFtZSA9IHhockNvbnRhY3QuZGlzcGxheU5hbWUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHByb2dyZXNzIGluZGljYXRvclxuXHRcdFx0XHRpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xuXHRcdFx0XHRcdHByb2dyZXNzQ2FsbGJhY2sobnVtIC8gc2luZ2xlVkNhcmRzLmxlbmd0aCwgeGhyQ29udGFjdE5hbWUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG51bSsrO1xuXHRcdFx0XHQvKiBJbXBvcnQgaXMgb3ZlciwgbGV0J3Mgbm90aWZ5ICovXG5cdFx0XHRcdGlmIChudW0gPT09IHNpbmdsZVZDYXJkcy5sZW5ndGggKyAxKSB7XG5cdFx0XHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdpbXBvcnRlbmQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9O1xuXG5cdHRoaXMubW92ZUNvbnRhY3QgPSBmdW5jdGlvbihjb250YWN0LCBhZGRyZXNzQm9vaywgb2xkQWRkcmVzc0Jvb2spIHtcblx0XHRpZiAoYWRkcmVzc0Jvb2sgIT09IG51bGwgJiYgY29udGFjdC5hZGRyZXNzQm9va0lkID09PSBhZGRyZXNzQm9vay5kaXNwbGF5TmFtZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAoYWRkcmVzc0Jvb2sucmVhZE9ubHkpIHtcblx0XHRcdE9DLk5vdGlmaWNhdGlvbi5zaG93VGVtcG9yYXJ5KHQoJ2NvbnRhY3RzJywgJ1lvdSBkb25cXCd0IGhhdmUgcGVybWlzc2lvbiB0byB3cml0ZSB0byB0aGlzIGFkZHJlc3Nib29rLicpKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29udGFjdC5zeW5jVkNhcmQoKTtcblxuXHRcdERhdkNsaWVudC54aHIuc2VuZChcblx0XHRcdGRhdi5yZXF1ZXN0LmJhc2ljKHttZXRob2Q6ICdNT1ZFJywgZGVzdGluYXRpb246IGFkZHJlc3NCb29rLnVybCArIGNvbnRhY3QuZGF0YS51cmwuc3BsaXQoJy8nKS5wb3AoLTEpfSksXG5cdFx0XHRjb250YWN0LmRhdGEudXJsXG5cdFx0KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDEgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSAyMDQpIHtcblx0XHRcdFx0Y29udGFjdC5zZXRBZGRyZXNzQm9vayhhZGRyZXNzQm9vayk7XG5cdFx0XHRcdEFkZHJlc3NCb29rU2VydmljZS5hZGRDb250YWN0KGFkZHJlc3NCb29rLCBjb250YWN0KTtcblx0XHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnJlbW92ZUNvbnRhY3Qob2xkQWRkcmVzc0Jvb2ssIGNvbnRhY3QpO1xuXHRcdFx0XHRub3RpZnlPYnNlcnZlcnMoJ2dyb3Vwc1VwZGF0ZScpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0T0MuTm90aWZpY2F0aW9uLnNob3dUZW1wb3JhcnkodCgnY29udGFjdHMnLCAnQ29udGFjdCBjb3VsZCBub3QgYmUgbW92ZWQuJykpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG5cdHRoaXMudXBkYXRlID0gZnVuY3Rpb24oY29udGFjdCkge1xuXHRcdC8vIHVwZGF0ZSByZXYgZmllbGRcblx0XHRjb250YWN0LnN5bmNWQ2FyZCgpO1xuXG5cdFx0Ly8gdXBkYXRlIGNvbnRhY3Qgb24gc2VydmVyXG5cdFx0cmV0dXJuIERhdkNsaWVudC51cGRhdGVDYXJkKGNvbnRhY3QuZGF0YSwge2pzb246IHRydWV9KS50aGVuKGZ1bmN0aW9uKHhocikge1xuXHRcdFx0dmFyIG5ld0V0YWcgPSB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0VUYWcnKTtcblx0XHRcdGNvbnRhY3Quc2V0RVRhZyhuZXdFdGFnKTtcblx0XHRcdG5vdGlmeU9ic2VydmVycygndXBkYXRlJywgY29udGFjdC51aWQoKSk7XG5cdFx0fSkuY2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRPQy5Ob3RpZmljYXRpb24uc2hvd1RlbXBvcmFyeSh0KCdjb250YWN0cycsICdDb250YWN0IGNvdWxkIG5vdCBiZSBzYXZlZC4nKSk7XG5cdFx0fSk7XG5cdH07XG5cblx0dGhpcy5kZWxldGUgPSBmdW5jdGlvbihhZGRyZXNzQm9vaywgY29udGFjdCkge1xuXHRcdC8vIGRlbGV0ZSBjb250YWN0IGZyb20gc2VydmVyXG5cdFx0cmV0dXJuIERhdkNsaWVudC5kZWxldGVDYXJkKGNvbnRhY3QuZGF0YSkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdGNvbnRhY3RzQ2FjaGUucmVtb3ZlKGNvbnRhY3QudWlkKCkpO1xuXHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnJlbW92ZUNvbnRhY3QoYWRkcmVzc0Jvb2ssIGNvbnRhY3QpO1xuXHRcdFx0bm90aWZ5T2JzZXJ2ZXJzKCdkZWxldGUnLCBjb250YWN0LnVpZCgpKTtcblx0XHR9KTtcblx0fTtcblxuXHQvKlxuXHQgKiBEZWxldGUgYWxsIGNvbnRhY3RzIHByZXNlbnQgaW4gdGhlIGFkZHJlc3NCb29rIGZyb20gdGhlIGNhY2hlXG5cdCAqL1xuXHR0aGlzLnJlbW92ZUNvbnRhY3RzRnJvbUFkZHJlc3Nib29rID0gZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIGNhbGxiYWNrKSB7XG5cdFx0YW5ndWxhci5mb3JFYWNoKGFkZHJlc3NCb29rLmNvbnRhY3RzLCBmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRjb250YWN0c0NhY2hlLnJlbW92ZShjb250YWN0LnVpZCgpKTtcblx0XHR9KTtcblx0XHRjYWxsYmFjaygpO1xuXHRcdG5vdGlmeU9ic2VydmVycygnZ3JvdXBzVXBkYXRlJyk7XG5cdH07XG5cblx0Lypcblx0ICogQ3JlYXRlIGFuZCBhcHBlbmQgY29udGFjdHMgdG8gdGhlIGFkZHJlc3NCb29rXG5cdCAqL1xuXHR0aGlzLmFwcGVuZENvbnRhY3RzRnJvbUFkZHJlc3Nib29rID0gZnVuY3Rpb24oYWRkcmVzc0Jvb2ssIGNhbGxiYWNrKSB7XG5cdFx0Ly8gQWRkcmVzc2Jvb2sgaGFzIGJlZW4gaW5pdGlhdGVkIGJ1dCBjb250YWN0cyBoYXZlIG5vdCBiZWVuIGZldGNoZWRcblx0XHRpZiAoYWRkcmVzc0Jvb2sub2JqZWN0cyA9PT0gbnVsbCkge1xuXHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLnN5bmMoYWRkcmVzc0Jvb2spLnRoZW4oZnVuY3Rpb24oYWRkcmVzc0Jvb2spIHtcblx0XHRcdFx0Y29udGFjdFNlcnZpY2UuYXBwZW5kQ29udGFjdHNGcm9tQWRkcmVzc2Jvb2soYWRkcmVzc0Jvb2ssIGNhbGxiYWNrKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSBpZiAoYWRkcmVzc0Jvb2suY29udGFjdHMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHQvLyBPbmx5IGFkZCBjb250YWN0IGlmIHRoZSBhZGRyZXNzQm9vayBkb2Vzbid0IGFscmVhZHkgaGF2ZSBpdFxuXHRcdFx0YWRkcmVzc0Jvb2sub2JqZWN0cy5mb3JFYWNoKGZ1bmN0aW9uKHZjYXJkKSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Ly8gT25seSBhZGQgY29udGFjdCBpZiB0aGUgYWRkcmVzc0Jvb2sgZG9lc24ndCBhbHJlYWR5IGhhdmUgaXRcblx0XHRcdFx0XHR2YXIgY29udGFjdCA9IG5ldyBDb250YWN0KGFkZHJlc3NCb29rLCB2Y2FyZCk7XG5cdFx0XHRcdFx0Y29udGFjdHNDYWNoZS5wdXQoY29udGFjdC51aWQoKSwgY29udGFjdCk7XG5cdFx0XHRcdFx0QWRkcmVzc0Jvb2tTZXJ2aWNlLmFkZENvbnRhY3QoYWRkcmVzc0Jvb2ssIGNvbnRhY3QpO1xuXHRcdFx0XHR9IGNhdGNoKGVycm9yKSB7XG5cdFx0XHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnSW52YWxpZCBjb250YWN0IHJlY2VpdmVkOiAnLCB2Y2FyZCwgZXJyb3IpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gQ29udGFjdCBhcmUgYWxyZWFkeSBwcmVzZW50IGluIHRoZSBhZGRyZXNzQm9va1xuXHRcdFx0YW5ndWxhci5mb3JFYWNoKGFkZHJlc3NCb29rLmNvbnRhY3RzLCBmdW5jdGlvbihjb250YWN0KSB7XG5cdFx0XHRcdGNvbnRhY3RzQ2FjaGUucHV0KGNvbnRhY3QudWlkKCksIGNvbnRhY3QpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdG5vdGlmeU9ic2VydmVycygnZ3JvdXBzVXBkYXRlJyk7XG5cdFx0aWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0Y2FsbGJhY2soKTtcblx0XHR9XG5cdH07XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5zZXJ2aWNlKCdEYXZDbGllbnQnLCBmdW5jdGlvbigpIHtcblx0dmFyIHhociA9IG5ldyBkYXYudHJhbnNwb3J0LkJhc2ljKFxuXHRcdG5ldyBkYXYuQ3JlZGVudGlhbHMoKVxuXHQpO1xuXHRyZXR1cm4gbmV3IGRhdi5DbGllbnQoeGhyKTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5zZXJ2aWNlKCdEYXZTZXJ2aWNlJywgZnVuY3Rpb24oRGF2Q2xpZW50KSB7XG5cdHJldHVybiBEYXZDbGllbnQuY3JlYXRlQWNjb3VudCh7XG5cdFx0c2VydmVyOiBPQy5saW5rVG9SZW1vdGUoJ2Rhdi9hZGRyZXNzYm9va3MnKSxcblx0XHRhY2NvdW50VHlwZTogJ2NhcmRkYXYnLFxuXHRcdHVzZVByb3ZpZGVkUGF0aDogdHJ1ZVxuXHR9KTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5zZXJ2aWNlKCdJbXBvcnRTZXJ2aWNlJywgZnVuY3Rpb24oKSB7XG5cblx0dGhpcy5pbXBvcnRpbmcgPSBmYWxzZTtcblx0dGhpcy5zZWxlY3RlZEFkZHJlc3NCb29rID0gdCgnY29udGFjdHMnLCAnSW1wb3J0IGludG8nKTtcblx0dGhpcy5pbXBvcnRlZFVzZXIgPSB0KCdjb250YWN0cycsICdXYWl0aW5nIGZvciB0aGUgc2VydmVyIHRvIGJlIHJlYWR54oCmJyk7XG5cdHRoaXMuaW1wb3J0UGVyY2VudCA9IDA7XG5cblx0dGhpcy50ID0ge1xuXHRcdGltcG9ydFRleHQgOiB0KCdjb250YWN0cycsICdJbXBvcnQgaW50bycpLFxuXHRcdGltcG9ydGluZ1RleHQgOiB0KCdjb250YWN0cycsICdJbXBvcnRpbmfigKYnKVxuXHR9O1xuXG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG5cdC5zZXJ2aWNlKCdNaW1lU2VydmljZScsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBtYWdpY051bWJlcnMgPSB7XG5cdFx0XHQnLzlqLycgOiAnSlBFRycsXG5cdFx0XHQnUjBsR09EJyA6ICdHSUYnLFxuXHRcdFx0J2lWQk9SdzBLR2dvJyA6ICdQTkcnXG5cdFx0fTtcblxuXHRcdHRoaXMuYjY0bWltZSA9IGZ1bmN0aW9uKGI2NHN0cmluZykge1xuXHRcdFx0Zm9yICh2YXIgbW4gaW4gbWFnaWNOdW1iZXJzKSB7XG5cdFx0XHRcdGlmKGI2NHN0cmluZy5zdGFydHNXaXRoKG1uKSkgcmV0dXJuIG1hZ2ljTnVtYmVyc1ttbl07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9O1xuXHR9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uc2VydmljZSgnU2VhcmNoU2VydmljZScsIGZ1bmN0aW9uKCkge1xuXHR2YXIgc2VhcmNoVGVybSA9ICcnO1xuXG5cdHZhciBvYnNlcnZlckNhbGxiYWNrcyA9IFtdO1xuXG5cdHRoaXMucmVnaXN0ZXJPYnNlcnZlckNhbGxiYWNrID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRvYnNlcnZlckNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcblx0fTtcblxuXHR2YXIgbm90aWZ5T2JzZXJ2ZXJzID0gZnVuY3Rpb24oZXZlbnROYW1lKSB7XG5cdFx0dmFyIGV2ID0ge1xuXHRcdFx0ZXZlbnQ6ZXZlbnROYW1lLFxuXHRcdFx0c2VhcmNoVGVybTpzZWFyY2hUZXJtXG5cdFx0fTtcblx0XHRhbmd1bGFyLmZvckVhY2gob2JzZXJ2ZXJDYWxsYmFja3MsIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHRjYWxsYmFjayhldik7XG5cdFx0fSk7XG5cdH07XG5cblx0dmFyIFNlYXJjaFByb3h5ID0ge1xuXHRcdGF0dGFjaDogZnVuY3Rpb24oc2VhcmNoKSB7XG5cdFx0XHRzZWFyY2guc2V0RmlsdGVyKCdjb250YWN0cycsIHRoaXMuZmlsdGVyUHJveHkpO1xuXHRcdH0sXG5cdFx0ZmlsdGVyUHJveHk6IGZ1bmN0aW9uKHF1ZXJ5KSB7XG5cdFx0XHRzZWFyY2hUZXJtID0gcXVlcnk7XG5cdFx0XHRub3RpZnlPYnNlcnZlcnMoJ2NoYW5nZVNlYXJjaCcpO1xuXHRcdH1cblx0fTtcblxuXHR0aGlzLmdldFNlYXJjaFRlcm0gPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gc2VhcmNoVGVybTtcblx0fTtcblxuXHR0aGlzLmNsZWFuU2VhcmNoID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCFfLmlzVW5kZWZpbmVkKCQoJy5zZWFyY2hib3gnKSkpIHtcblx0XHRcdCQoJy5zZWFyY2hib3gnKVswXS5yZXNldCgpO1xuXHRcdH1cblx0XHRzZWFyY2hUZXJtID0gJyc7XG5cdH07XG5cblx0aWYgKCFfLmlzVW5kZWZpbmVkKE9DLlBsdWdpbnMpKSB7XG5cdFx0T0MuUGx1Z2lucy5yZWdpc3RlcignT0NBLlNlYXJjaCcsIFNlYXJjaFByb3h5KTtcblx0XHRpZiAoIV8uaXNVbmRlZmluZWQoT0NBLlNlYXJjaCkpIHtcblx0XHRcdE9DLlNlYXJjaCA9IG5ldyBPQ0EuU2VhcmNoKCQoJyNzZWFyY2hib3gnKSwgJCgnI3NlYXJjaHJlc3VsdHMnKSk7XG5cdFx0XHQkKCcjc2VhcmNoYm94Jykuc2hvdygpO1xuXHRcdH1cblx0fVxuXG5cdGlmICghXy5pc1VuZGVmaW5lZCgkKCcuc2VhcmNoYm94JykpKSB7XG5cdFx0JCgnLnNlYXJjaGJveCcpWzBdLmFkZEV2ZW50TGlzdGVuZXIoJ2tleXByZXNzJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0aWYoZS5rZXlDb2RlID09PSAxMykge1xuXHRcdFx0XHRub3RpZnlPYnNlcnZlcnMoJ3N1Ym1pdFNlYXJjaCcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uc2VydmljZSgnU2V0dGluZ3NTZXJ2aWNlJywgZnVuY3Rpb24oKSB7XG5cdHZhciBzZXR0aW5ncyA9IHtcblx0XHRhZGRyZXNzQm9va3M6IFtcblx0XHRcdCd0ZXN0QWRkcidcblx0XHRdXG5cdH07XG5cblx0dGhpcy5zZXQgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdFx0c2V0dGluZ3Nba2V5XSA9IHZhbHVlO1xuXHR9O1xuXG5cdHRoaXMuZ2V0ID0gZnVuY3Rpb24oa2V5KSB7XG5cdFx0cmV0dXJuIHNldHRpbmdzW2tleV07XG5cdH07XG5cblx0dGhpcy5nZXRBbGwgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gc2V0dGluZ3M7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uc2VydmljZSgnU29ydEJ5U2VydmljZScsIGZ1bmN0aW9uICgpIHtcblx0dmFyIHN1YnNjcmlwdGlvbnMgPSBbXTtcblxuXHQvLyBBcnJheSBvZiBrZXlzIHRvIHNvcnQgYnkuIE9yZGVyZWQgYnkgcHJpb3JpdGllcy5cblx0dmFyIHNvcnRPcHRpb25zID0ge1xuXHRcdHNvcnRGaXJzdE5hbWU6IFsnZmlyc3ROYW1lJywgJ2xhc3ROYW1lJywgJ3VpZCddLFxuXHRcdHNvcnRMYXN0TmFtZTogWydsYXN0TmFtZScsICdmaXJzdE5hbWUnLCAndWlkJ10sXG5cdFx0c29ydERpc3BsYXlOYW1lOiBbJ2Rpc3BsYXlOYW1lJywgJ3VpZCddXG5cdH07XG5cblx0Ly8gS2V5XG5cdHZhciBzb3J0QnkgPSAnc29ydERpc3BsYXlOYW1lJztcblxuXHR2YXIgZGVmYXVsdE9yZGVyID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjb250YWN0c19kZWZhdWx0X29yZGVyJyk7XG5cdGlmIChkZWZhdWx0T3JkZXIpIHtcblx0XHRzb3J0QnkgPSBkZWZhdWx0T3JkZXI7XG5cdH1cblxuXHRmdW5jdGlvbiBub3RpZnlPYnNlcnZlcnMoKSB7XG5cdFx0YW5ndWxhci5mb3JFYWNoKHN1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uIChzdWJzY3JpcHRpb24pIHtcblx0XHRcdGlmICh0eXBlb2Ygc3Vic2NyaXB0aW9uID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHN1YnNjcmlwdGlvbihzb3J0T3B0aW9uc1tzb3J0QnldKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0c3Vic2NyaWJlOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0XHRcdHN1YnNjcmlwdGlvbnMucHVzaChjYWxsYmFjayk7XG5cdFx0fSxcblx0XHRzZXRTb3J0Qnk6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0c29ydEJ5ID0gdmFsdWU7XG5cdFx0XHR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NvbnRhY3RzX2RlZmF1bHRfb3JkZXInLCB2YWx1ZSk7XG5cdFx0XHRub3RpZnlPYnNlcnZlcnMoKTtcblx0XHR9LFxuXHRcdGdldFNvcnRCeTogZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIHNvcnRPcHRpb25zW3NvcnRCeV07XG5cdFx0fSxcblx0XHRnZXRTb3J0QnlLZXk6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBzb3J0Qnk7XG5cdFx0fSxcblx0XHRnZXRTb3J0QnlMaXN0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzb3J0RGlzcGxheU5hbWU6IHQoJ2NvbnRhY3RzJywgJ0Rpc3BsYXkgbmFtZScpLFxuXHRcdFx0XHRzb3J0Rmlyc3ROYW1lOiB0KCdjb250YWN0cycsICdGaXJzdCBuYW1lJyksXG5cdFx0XHRcdHNvcnRMYXN0TmFtZTogdCgnY29udGFjdHMnLCAnTGFzdCBuYW1lJylcblx0XHRcdH07XG5cdFx0fVxuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLnNlcnZpY2UoJ3ZDYXJkUHJvcGVydGllc1NlcnZpY2UnLCBmdW5jdGlvbigpIHtcblx0LyoqXG5cdCAqIG1hcCB2Q2FyZCBhdHRyaWJ1dGVzIHRvIGludGVybmFsIGF0dHJpYnV0ZXNcblx0ICpcblx0ICogcHJvcE5hbWU6IHtcblx0ICogXHRcdG11bHRpcGxlOiBbQm9vbGVhbl0sIC8vIGlzIHRoaXMgcHJvcCBhbGxvd2VkIG1vcmUgdGhhbiBvbmNlPyAoZGVmYXVsdCA9IGZhbHNlKVxuXHQgKiBcdFx0cmVhZGFibGVOYW1lOiBbU3RyaW5nXSwgLy8gaW50ZXJuYXRpb25hbGl6ZWQgcmVhZGFibGUgbmFtZSBvZiBwcm9wXG5cdCAqIFx0XHR0ZW1wbGF0ZTogW1N0cmluZ10sIC8vIHRlbXBsYXRlIG5hbWUgZm91bmQgaW4gL3RlbXBsYXRlcy9kZXRhaWxJdGVtc1xuXHQgKiBcdFx0Wy4uLl0gLy8gb3B0aW9uYWwgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiB3aGljaCBtaWdodCBnZXQgdXNlZCBieSB0aGUgdGVtcGxhdGVcblx0ICpcblx0ICpcdFx0b3B0aW9uczogSWYgbXVsdGlwbGUgb3B0aW9ucyBoYXZlIHRoZSBzYW1lIG5hbWUsIHRoZSBmaXJzdCB3aWxsIGJlIHVzZWQgYXMgZGVmYXVsdC5cblx0ICpcdFx0XHRcdCBPdGhlcnMgd2lsbCBiZSBtZXJnZSwgYnV0IHN0aWxsIHN1cHBvcnRlZC4gT3JkZXIgaXMgaW1wb3J0YW50IVxuXHQgKiB9XG5cdCAqL1xuXHR0aGlzLnZDYXJkTWV0YSA9IHtcblx0XHRuaWNrbmFtZToge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdOaWNrbmFtZScpLFxuXHRcdFx0dGVtcGxhdGU6ICd0ZXh0Jyxcblx0XHRcdGljb246ICdpY29uLXVzZXInXG5cdFx0fSxcblx0XHRuOiB7XG5cdFx0XHRyZWFkYWJsZU5hbWU6IHQoJ2NvbnRhY3RzJywgJ0RldGFpbGVkIG5hbWUnKSxcblx0XHRcdGRlZmF1bHRWYWx1ZToge1xuXHRcdFx0XHR2YWx1ZTpbJycsICcnLCAnJywgJycsICcnXVxuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlOiAnbicsXG5cdFx0XHRpY29uOiAnaWNvbi11c2VyJ1xuXHRcdH0sXG5cdFx0bm90ZToge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdOb3RlcycpLFxuXHRcdFx0dGVtcGxhdGU6ICd0ZXh0YXJlYScsXG5cdFx0XHRpY29uOiAnaWNvbi1yZW5hbWUnXG5cdFx0fSxcblx0XHR1cmw6IHtcblx0XHRcdG11bHRpcGxlOiB0cnVlLFxuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdXZWJzaXRlJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ3VybCcsXG5cdFx0XHRpY29uOiAnaWNvbi1wdWJsaWMnXG5cdFx0fSxcblx0XHRjbG91ZDoge1xuXHRcdFx0bXVsdGlwbGU6IHRydWUsXG5cdFx0XHRyZWFkYWJsZU5hbWU6IHQoJ2NvbnRhY3RzJywgJ0ZlZGVyYXRlZCBDbG91ZCBJRCcpLFxuXHRcdFx0dGVtcGxhdGU6ICd0ZXh0Jyxcblx0XHRcdGRlZmF1bHRWYWx1ZToge1xuXHRcdFx0XHR2YWx1ZTpbJyddLFxuXHRcdFx0XHRtZXRhOnt0eXBlOlsnSE9NRSddfVxuXHRcdFx0fSxcblx0XHRcdG9wdGlvbnM6IFtcblx0XHRcdFx0e2lkOiAnSE9NRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0hvbWUnKX0sXG5cdFx0XHRcdHtpZDogJ1dPUksnLCBuYW1lOiB0KCdjb250YWN0cycsICdXb3JrJyl9LFxuXHRcdFx0XHR7aWQ6ICdPVEhFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ090aGVyJyl9XG5cdFx0XHRdXHRcdH0sXG5cdFx0YWRyOiB7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnQWRkcmVzcycpLFxuXHRcdFx0dGVtcGxhdGU6ICdhZHInLFxuXHRcdFx0aWNvbjogJ2ljb24tYWRkcmVzcycsXG5cdFx0XHRkZWZhdWx0VmFsdWU6IHtcblx0XHRcdFx0dmFsdWU6WycnLCAnJywgJycsICcnLCAnJywgJycsICcnXSxcblx0XHRcdFx0bWV0YTp7dHlwZTpbJ0hPTUUnXX1cblx0XHRcdH0sXG5cdFx0XHRvcHRpb25zOiBbXG5cdFx0XHRcdHtpZDogJ0hPTUUnLCBuYW1lOiB0KCdjb250YWN0cycsICdIb21lJyl9LFxuXHRcdFx0XHR7aWQ6ICdXT1JLJywgbmFtZTogdCgnY29udGFjdHMnLCAnV29yaycpfSxcblx0XHRcdFx0e2lkOiAnT1RIRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdPdGhlcicpfVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0Y2F0ZWdvcmllczoge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdHcm91cHMnKSxcblx0XHRcdHRlbXBsYXRlOiAnZ3JvdXBzJ1xuXHRcdH0sXG5cdFx0YmRheToge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdCaXJ0aGRheScpLFxuXHRcdFx0dGVtcGxhdGU6ICdkYXRlJyxcblx0XHRcdGljb246ICdpY29uLWNhbGVuZGFyLWRhcmsnXG5cdFx0fSxcblx0XHRhbm5pdmVyc2FyeToge1xuXHRcdFx0cmVhZGFibGVOYW1lOiB0KCdjb250YWN0cycsICdBbm5pdmVyc2FyeScpLFxuXHRcdFx0dGVtcGxhdGU6ICdkYXRlJyxcblx0XHRcdGljb246ICdpY29uLWNhbGVuZGFyLWRhcmsnXG5cdFx0fSxcblx0XHRkZWF0aGRhdGU6IHtcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnRGF0ZSBvZiBkZWF0aCcpLFxuXHRcdFx0dGVtcGxhdGU6ICdkYXRlJyxcblx0XHRcdGljb246ICdpY29uLWNhbGVuZGFyLWRhcmsnXG5cdFx0fSxcblx0XHRlbWFpbDoge1xuXHRcdFx0bXVsdGlwbGU6IHRydWUsXG5cdFx0XHRyZWFkYWJsZU5hbWU6IHQoJ2NvbnRhY3RzJywgJ0VtYWlsJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ2VtYWlsJyxcblx0XHRcdGljb246ICdpY29uLW1haWwnLFxuXHRcdFx0ZGVmYXVsdFZhbHVlOiB7XG5cdFx0XHRcdHZhbHVlOicnLFxuXHRcdFx0XHRtZXRhOnt0eXBlOlsnSE9NRSddfVxuXHRcdFx0fSxcblx0XHRcdG9wdGlvbnM6IFtcblx0XHRcdFx0e2lkOiAnSE9NRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0hvbWUnKX0sXG5cdFx0XHRcdHtpZDogJ1dPUksnLCBuYW1lOiB0KCdjb250YWN0cycsICdXb3JrJyl9LFxuXHRcdFx0XHR7aWQ6ICdPVEhFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ090aGVyJyl9XG5cdFx0XHRdXG5cdFx0fSxcblx0XHRpbXBwOiB7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnSW5zdGFudCBtZXNzYWdpbmcnKSxcblx0XHRcdHRlbXBsYXRlOiAndXNlcm5hbWUnLFxuXHRcdFx0aWNvbjogJ2ljb24tY29tbWVudCcsXG5cdFx0XHRkZWZhdWx0VmFsdWU6IHtcblx0XHRcdFx0dmFsdWU6WycnXSxcblx0XHRcdFx0bWV0YTp7dHlwZTpbJ1NLWVBFJ119XG5cdFx0XHR9LFxuXHRcdFx0b3B0aW9uczogW1xuXHRcdFx0XHR7aWQ6ICdJUkMnLCBuYW1lOiAnSVJDJ30sXG5cdFx0XHRcdHtpZDogJ0tJSycsIG5hbWU6ICdLaUsnfSxcblx0XHRcdFx0e2lkOiAnU0tZUEUnLCBuYW1lOiAnU2t5cGUnfSxcblx0XHRcdFx0e2lkOiAnVEVMRUdSQU0nLCBuYW1lOiAnVGVsZWdyYW0nfSxcblx0XHRcdFx0e2lkOiAnWE1QUCcsIG5hbWU6J1hNUFAnfVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0dGVsOiB7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnUGhvbmUnKSxcblx0XHRcdHRlbXBsYXRlOiAndGVsJyxcblx0XHRcdGljb246ICdpY29uLWNvbW1lbnQnLFxuXHRcdFx0ZGVmYXVsdFZhbHVlOiB7XG5cdFx0XHRcdHZhbHVlOicnLFxuXHRcdFx0XHRtZXRhOnt0eXBlOlsnSE9NRSxWT0lDRSddfVxuXHRcdFx0fSxcblx0XHRcdG9wdGlvbnM6IFtcblx0XHRcdFx0e2lkOiAnSE9NRSxWT0lDRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0hvbWUnKX0sXG5cdFx0XHRcdHtpZDogJ0hPTUUnLCBuYW1lOiB0KCdjb250YWN0cycsICdIb21lJyl9LFxuXHRcdFx0XHR7aWQ6ICdXT1JLLFZPSUNFJywgbmFtZTogdCgnY29udGFjdHMnLCAnV29yaycpfSxcblx0XHRcdFx0e2lkOiAnV09SSycsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1dvcmsnKX0sXG5cdFx0XHRcdHtpZDogJ0NFTEwnLCBuYW1lOiB0KCdjb250YWN0cycsICdNb2JpbGUnKX0sXG5cdFx0XHRcdHtpZDogJ0NFTEwsVk9JQ0UnLCBuYW1lOiB0KCdjb250YWN0cycsICdNb2JpbGUnKX0sXG5cdFx0XHRcdHtpZDogJ1dPUkssQ0VMTCcsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1dvcmsgbW9iaWxlJyl9LFxuXHRcdFx0XHR7aWQ6ICdGQVgnLCBuYW1lOiB0KCdjb250YWN0cycsICdGYXgnKX0sXG5cdFx0XHRcdHtpZDogJ0hPTUUsRkFYJywgbmFtZTogdCgnY29udGFjdHMnLCAnRmF4IGhvbWUnKX0sXG5cdFx0XHRcdHtpZDogJ1dPUkssRkFYJywgbmFtZTogdCgnY29udGFjdHMnLCAnRmF4IHdvcmsnKX0sXG5cdFx0XHRcdHtpZDogJ1BBR0VSJywgbmFtZTogdCgnY29udGFjdHMnLCAnUGFnZXInKX0sXG5cdFx0XHRcdHtpZDogJ1ZPSUNFJywgbmFtZTogdCgnY29udGFjdHMnLCAnVm9pY2UnKX0sXG5cdFx0XHRcdHtpZDogJ0NBUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0NhcicpfSxcblx0XHRcdFx0e2lkOiAnUEFHRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdQYWdlcicpfSxcblx0XHRcdFx0e2lkOiAnV09SSyxQQUdFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1dvcmsgcGFnZXInKX1cblx0XHRcdF1cblx0XHR9LFxuXHRcdCdYLVNPQ0lBTFBST0ZJTEUnOiB7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnU29jaWFsIG5ldHdvcmsnKSxcblx0XHRcdHRlbXBsYXRlOiAndXNlcm5hbWUnLFxuXHRcdFx0ZGVmYXVsdFZhbHVlOiB7XG5cdFx0XHRcdHZhbHVlOlsnJ10sXG5cdFx0XHRcdG1ldGE6e3R5cGU6WydmYWNlYm9vayddfVxuXHRcdFx0fSxcblx0XHRcdG9wdGlvbnM6IFtcblx0XHRcdFx0e2lkOiAnRkFDRUJPT0snLCBuYW1lOiAnRmFjZWJvb2snfSxcblx0XHRcdFx0e2lkOiAnR0lUSFVCJywgbmFtZTogJ0dpdEh1Yid9LFxuXHRcdFx0XHR7aWQ6ICdHT09HTEVQTFVTJywgbmFtZTogJ0dvb2dsZSsnfSxcblx0XHRcdFx0e2lkOiAnSU5TVEFHUkFNJywgbmFtZTogJ0luc3RhZ3JhbSd9LFxuXHRcdFx0XHR7aWQ6ICdMSU5LRURJTicsIG5hbWU6ICdMaW5rZWRJbid9LFxuXHRcdFx0XHR7aWQ6ICdQSU5URVJFU1QnLCBuYW1lOiAnUGludGVyZXN0J30sXG5cdFx0XHRcdHtpZDogJ1FaT05FJywgbmFtZTogJ1Fab25lJ30sXG5cdFx0XHRcdHtpZDogJ1RVTUJMUicsIG5hbWU6ICdUdW1ibHInfSxcblx0XHRcdFx0e2lkOiAnVFdJVFRFUicsIG5hbWU6ICdUd2l0dGVyJ30sXG5cdFx0XHRcdHtpZDogJ1dFQ0hBVCcsIG5hbWU6ICdXZUNoYXQnfSxcblx0XHRcdFx0e2lkOiAnWU9VVFVCRScsIG5hbWU6ICdZb3VUdWJlJ31cblxuXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRyZWxhdGlvbnNoaXA6IHtcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnUmVsYXRpb25zaGlwJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ3NlbGVjdCcsXG5cdFx0XHRvcHRpb25zOiBbXG5cdFx0XHRcdHtpZDogJ1NQT1VTRScsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1Nwb3VzZScpfSxcblx0XHRcdFx0e2lkOiAnQ0hJTEQnLCBuYW1lOiB0KCdjb250YWN0cycsICdDaGlsZCcpfSxcblx0XHRcdFx0e2lkOiAnTU9USEVSJywgbmFtZTogdCgnY29udGFjdHMnLCAnTW90aGVyJyl9LFxuXHRcdFx0XHR7aWQ6ICdGQVRIRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdGYXRoZXInKX0sXG5cdFx0XHRcdHtpZDogJ1BBUkVOVCcsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1BhcmVudCcpfSxcblx0XHRcdFx0e2lkOiAnQlJPVEhFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ0Jyb3RoZXInKX0sXG5cdFx0XHRcdHtpZDogJ1NJU1RFUicsIG5hbWU6IHQoJ2NvbnRhY3RzJywgJ1Npc3RlcicpfSxcblx0XHRcdFx0e2lkOiAnUkVMQVRJVkUnLCBuYW1lOiB0KCdjb250YWN0cycsICdSZWxhdGl2ZScpfSxcblx0XHRcdFx0e2lkOiAnRlJJRU5EJywgbmFtZTogdCgnY29udGFjdHMnLCAnRnJpZW5kJyl9LFxuXHRcdFx0XHR7aWQ6ICdDT0xMRUFHVUUnLCBuYW1lOiB0KCdjb250YWN0cycsICdDb2xsZWFndWUnKX0sXG5cdFx0XHRcdHtpZDogJ01BTkFHRVInLCBuYW1lOiB0KCdjb250YWN0cycsICdNYW5hZ2VyJyl9LFxuXHRcdFx0XHR7aWQ6ICdBU1NJU1RBTlQnLCBuYW1lOiB0KCdjb250YWN0cycsICdBc3Npc3RhbnQnKX0sXG5cdFx0XHRdXG5cdFx0fSxcblx0XHRnZW5kZXI6IHtcblx0XHRcdHJlYWRhYmxlTmFtZTogdCgnY29udGFjdHMnLCAnR2VuZGVyJyksXG5cdFx0XHR0ZW1wbGF0ZTogJ3NlbGVjdCcsXG5cdFx0XHRvcHRpb25zOiBbXG5cdFx0XHRcdHtpZDogJ0YnLCBuYW1lOiB0KCdjb250YWN0cycsICdGZW1hbGUnKX0sXG5cdFx0XHRcdHtpZDogJ00nLCBuYW1lOiB0KCdjb250YWN0cycsICdNYWxlJyl9LFxuXHRcdFx0XHR7aWQ6ICdPJywgbmFtZTogdCgnY29udGFjdHMnLCAnT3RoZXInKX1cblx0XHRcdF1cblx0XHR9XG5cdH07XG5cblx0dGhpcy5maWVsZE9yZGVyID0gW1xuXHRcdCdvcmcnLFxuXHRcdCd0aXRsZScsXG5cdFx0J3RlbCcsXG5cdFx0J2VtYWlsJyxcblx0XHQnYWRyJyxcblx0XHQnaW1wcCcsXG5cdFx0J25pY2snLFxuXHRcdCdiZGF5Jyxcblx0XHQnYW5uaXZlcnNhcnknLFxuXHRcdCdkZWF0aGRhdGUnLFxuXHRcdCd1cmwnLFxuXHRcdCdYLVNPQ0lBTFBST0ZJTEUnLFxuXHRcdCdyZWxhdGlvbnNoaXAnLFxuXHRcdCdub3RlJyxcblx0XHQnY2F0ZWdvcmllcycsXG5cdFx0J3JvbGUnLFxuXHRcdCdnZW5kZXInXG5cdF07XG5cblx0dGhpcy5maWVsZERlZmluaXRpb25zID0gW107XG5cdGZvciAodmFyIHByb3AgaW4gdGhpcy52Q2FyZE1ldGEpIHtcblx0XHR0aGlzLmZpZWxkRGVmaW5pdGlvbnMucHVzaCh7aWQ6IHByb3AsIG5hbWU6IHRoaXMudkNhcmRNZXRhW3Byb3BdLnJlYWRhYmxlTmFtZSwgbXVsdGlwbGU6ICEhdGhpcy52Q2FyZE1ldGFbcHJvcF0ubXVsdGlwbGV9KTtcblx0fVxuXG5cdHRoaXMuZmFsbGJhY2tNZXRhID0gZnVuY3Rpb24ocHJvcGVydHkpIHtcblx0XHRmdW5jdGlvbiBjYXBpdGFsaXplKHN0cmluZykgeyByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpOyB9XG5cdFx0cmV0dXJuIHtcblx0XHRcdG5hbWU6ICd1bmtub3duLScgKyBwcm9wZXJ0eSxcblx0XHRcdHJlYWRhYmxlTmFtZTogY2FwaXRhbGl6ZShwcm9wZXJ0eSksXG5cdFx0XHR0ZW1wbGF0ZTogJ2hpZGRlbicsXG5cdFx0XHRuZWNlc3NpdHk6ICdvcHRpb25hbCcsXG5cdFx0XHRoaWRkZW46IHRydWVcblx0XHR9O1xuXHR9O1xuXG5cdHRoaXMuZ2V0TWV0YSA9IGZ1bmN0aW9uKHByb3BlcnR5KSB7XG5cdFx0cmV0dXJuIHRoaXMudkNhcmRNZXRhW3Byb3BlcnR5XSB8fCB0aGlzLmZhbGxiYWNrTWV0YShwcm9wZXJ0eSk7XG5cdH07XG5cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5maWx0ZXIoJ0pTT04ydkNhcmQnLCBmdW5jdGlvbigpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKGlucHV0KSB7XG5cdFx0cmV0dXJuIHZDYXJkLmdlbmVyYXRlKGlucHV0KTtcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5maWx0ZXIoJ2NvbnRhY3RDb2xvcicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcblx0XHQvLyBDaGVjayBpZiBjb3JlIGhhcyB0aGUgbmV3IGNvbG9yIGdlbmVyYXRvclxuXHRcdGlmKHR5cGVvZiBpbnB1dC50b0hzbCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0dmFyIGhzbCA9IGlucHV0LnRvSHNsKCk7XG5cdFx0XHRyZXR1cm4gJ2hzbCgnK2hzbFswXSsnLCAnK2hzbFsxXSsnJSwgJytoc2xbMl0rJyUpJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gSWYgbm90LCB3ZSB1c2UgdGhlIG9sZCBvbmVcblx0XHRcdC8qIGdsb2JhbCBtZDUgKi9cblx0XHRcdHZhciBoYXNoID0gbWQ1KGlucHV0KS5zdWJzdHJpbmcoMCwgNCksXG5cdFx0XHRcdG1heFJhbmdlID0gcGFyc2VJbnQoJ2ZmZmYnLCAxNiksXG5cdFx0XHRcdGh1ZSA9IHBhcnNlSW50KGhhc2gsIDE2KSAvIG1heFJhbmdlICogMjU2O1xuXHRcdFx0cmV0dXJuICdoc2woJyArIGh1ZSArICcsIDkwJSwgNjUlKSc7XG5cdFx0fVxuXHR9O1xufSk7IiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5maWx0ZXIoJ2NvbnRhY3RHcm91cEZpbHRlcicsIGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHJldHVybiBmdW5jdGlvbiAoY29udGFjdHMsIGdyb3VwKSB7XG5cdFx0aWYgKHR5cGVvZiBjb250YWN0cyA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHJldHVybiBjb250YWN0cztcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiBncm91cCA9PT0gJ3VuZGVmaW5lZCcgfHwgZ3JvdXAudG9Mb3dlckNhc2UoKSA9PT0gdCgnY29udGFjdHMnLCAnQWxsIGNvbnRhY3RzJykudG9Mb3dlckNhc2UoKSkge1xuXHRcdFx0cmV0dXJuIGNvbnRhY3RzO1xuXHRcdH1cblx0XHR2YXIgZmlsdGVyID0gW107XG5cdFx0aWYgKGNvbnRhY3RzLmxlbmd0aCA+IDApIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29udGFjdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKGdyb3VwLnRvTG93ZXJDYXNlKCkgPT09IHQoJ2NvbnRhY3RzJywgJ05vdCBncm91cGVkJykudG9Mb3dlckNhc2UoKSkge1xuXHRcdFx0XHRcdGlmIChjb250YWN0c1tpXS5jYXRlZ29yaWVzKCkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0XHRmaWx0ZXIucHVzaChjb250YWN0c1tpXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmIChjb250YWN0c1tpXS5jYXRlZ29yaWVzKCkuaW5kZXhPZihncm91cCkgPj0gMCkge1xuXHRcdFx0XHRcdFx0ZmlsdGVyLnB1c2goY29udGFjdHNbaV0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmlsdGVyO1xuXHR9O1xufSk7XG4iLCIvLyBmcm9tIGh0dHBzOi8vZG9jcy5uZXh0Y2xvdWQuY29tL3NlcnZlci8xMS9kZXZlbG9wZXJfbWFudWFsL2FwcC9jc3MuaHRtbCNtZW51c1xuYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5maWx0ZXIoJ2NvdW50ZXJGb3JtYXR0ZXInLCBmdW5jdGlvbiAoKSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0cmV0dXJuIGZ1bmN0aW9uIChjb3VudCkge1xuXHRcdGlmIChjb3VudCA+IDk5OTkpIHtcblx0XHRcdHJldHVybiAnOTk5OSsnO1xuXHRcdH1cblx0XHRpZiAoY291bnQgPT09IDApIHtcblx0XHRcdHJldHVybiAnJztcblx0XHR9XG5cdFx0cmV0dXJuIGNvdW50O1xuXHR9O1xufSk7XG5cbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmlsdGVyKCdmaWVsZEZpbHRlcicsIGZ1bmN0aW9uKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHJldHVybiBmdW5jdGlvbiAoZmllbGRzLCBjb250YWN0KSB7XG5cdFx0aWYgKHR5cGVvZiBmaWVsZHMgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gZmllbGRzO1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIGNvbnRhY3QgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gZmllbGRzO1xuXHRcdH1cblx0XHR2YXIgZmlsdGVyID0gW107XG5cdFx0aWYgKGZpZWxkcy5sZW5ndGggPiAwKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAoZmllbGRzW2ldLm11bHRpcGxlICkge1xuXHRcdFx0XHRcdGZpbHRlci5wdXNoKGZpZWxkc1tpXSk7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKF8uaXNVbmRlZmluZWQoY29udGFjdC5nZXRQcm9wZXJ0eShmaWVsZHNbaV0uaWQpKSkge1xuXHRcdFx0XHRcdGZpbHRlci5wdXNoKGZpZWxkc1tpXSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZpbHRlcjtcblx0fTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NvbnRhY3RzQXBwJylcbi5maWx0ZXIoJ2ZpcnN0Q2hhcmFjdGVyJywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuXHRcdHJldHVybiBpbnB1dC5jaGFyQXQoMCk7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmlsdGVyKCdsb2NhbGVPcmRlckJ5JywgW2Z1bmN0aW9uICgpIHtcblx0cmV0dXJuIGZ1bmN0aW9uIChhcnJheSwgc29ydFByZWRpY2F0ZSwgcmV2ZXJzZU9yZGVyKSB7XG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KGFycmF5KSkgcmV0dXJuIGFycmF5O1xuXHRcdGlmICghc29ydFByZWRpY2F0ZSkgcmV0dXJuIGFycmF5O1xuXG5cdFx0dmFyIGFycmF5Q29weSA9IFtdO1xuXHRcdGFuZ3VsYXIuZm9yRWFjaChhcnJheSwgZnVuY3Rpb24gKGl0ZW0pIHtcblx0XHRcdGFycmF5Q29weS5wdXNoKGl0ZW0pO1xuXHRcdH0pO1xuXG5cdFx0YXJyYXlDb3B5LnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcblxuXG5cdFx0XHQvLyBEaWQgd2UgcGFzcyBtdWx0aXBsZSBzb3J0aW5nIG9wdGlvbnM/IElmIG5vdCwgY3JlYXRlIGFuIGFycmF5IGFueXdheS5cblx0XHRcdHNvcnRQcmVkaWNhdGUgPSBhbmd1bGFyLmlzQXJyYXkoc29ydFByZWRpY2F0ZSkgPyBzb3J0UHJlZGljYXRlOiBbc29ydFByZWRpY2F0ZV07XG5cdFx0XHQvLyBMZXQncyB0ZXN0IHRoZSBmaXJzdCBzb3J0IGFuZCBjb250aW51ZSBpZiBubyBzb3J0IG9jY3VyZWRcblx0XHRcdGZvcih2YXIgaT0wOyBpPHNvcnRQcmVkaWNhdGUubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIHNvcnRCeSA9IHNvcnRQcmVkaWNhdGVbaV07XG5cblx0XHRcdFx0dmFyIHZhbHVlQSA9IGFbc29ydEJ5XTtcblx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNGdW5jdGlvbih2YWx1ZUEpKSB7XG5cdFx0XHRcdFx0dmFsdWVBID0gYVtzb3J0QnldKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIHZhbHVlQiA9IGJbc29ydEJ5XTtcblx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNGdW5jdGlvbih2YWx1ZUIpKSB7XG5cdFx0XHRcdFx0dmFsdWVCID0gYltzb3J0QnldKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBTdGFydCBzb3J0aW5nXG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzU3RyaW5nKHZhbHVlQSkpIHtcblx0XHRcdFx0XHRpZih2YWx1ZUEgIT09IHZhbHVlQikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJldmVyc2VPcmRlciA/IHZhbHVlQi5sb2NhbGVDb21wYXJlKHZhbHVlQSkgOiB2YWx1ZUEubG9jYWxlQ29tcGFyZSh2YWx1ZUIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChhbmd1bGFyLmlzTnVtYmVyKHZhbHVlQSkgfHwgdHlwZW9mIHZhbHVlQSA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0XHRcdFx0aWYodmFsdWVBICE9PSB2YWx1ZUIpIHtcblx0XHRcdFx0XHRcdHJldHVybiByZXZlcnNlT3JkZXIgPyB2YWx1ZUIgLSB2YWx1ZUEgOiB2YWx1ZUEgLSB2YWx1ZUI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGFycmF5Q29weTtcblx0fTtcbn1dKTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmlsdGVyKCduZXdDb250YWN0JywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuXHRcdHJldHVybiBpbnB1dCAhPT0gJycgPyBpbnB1dCA6IHQoJ2NvbnRhY3RzJywgJ05ldyBjb250YWN0Jyk7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmlsdGVyKCdvcmRlckRldGFpbEl0ZW1zJywgZnVuY3Rpb24odkNhcmRQcm9wZXJ0aWVzU2VydmljZSkge1xuXHQndXNlIHN0cmljdCc7XG5cdHJldHVybiBmdW5jdGlvbihpdGVtcywgZmllbGQsIHJldmVyc2UpIHtcblxuXHRcdHZhciBmaWx0ZXJlZCA9IFtdO1xuXHRcdGFuZ3VsYXIuZm9yRWFjaChpdGVtcywgZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0ZmlsdGVyZWQucHVzaChpdGVtKTtcblx0XHR9KTtcblxuXHRcdHZhciBmaWVsZE9yZGVyID0gYW5ndWxhci5jb3B5KHZDYXJkUHJvcGVydGllc1NlcnZpY2UuZmllbGRPcmRlcik7XG5cdFx0Ly8gcmV2ZXJzZSB0byBtb3ZlIGN1c3RvbSBpdGVtcyB0byB0aGUgZW5kIChpbmRleE9mID09IC0xKVxuXHRcdGZpZWxkT3JkZXIucmV2ZXJzZSgpO1xuXG5cdFx0ZmlsdGVyZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuXHRcdFx0aWYoZmllbGRPcmRlci5pbmRleE9mKGFbZmllbGRdKSA8IGZpZWxkT3JkZXIuaW5kZXhPZihiW2ZpZWxkXSkpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0XHRpZihmaWVsZE9yZGVyLmluZGV4T2YoYVtmaWVsZF0pID4gZmllbGRPcmRlci5pbmRleE9mKGJbZmllbGRdKSkge1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9KTtcblxuXHRcdGlmKHJldmVyc2UpIGZpbHRlcmVkLnJldmVyc2UoKTtcblx0XHRyZXR1cm4gZmlsdGVyZWQ7XG5cdH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdjb250YWN0c0FwcCcpXG4uZmlsdGVyKCd0b0FycmF5JywgZnVuY3Rpb24oKSB7XG5cdHJldHVybiBmdW5jdGlvbihvYmopIHtcblx0XHRpZiAoIShvYmogaW5zdGFuY2VvZiBPYmplY3QpKSByZXR1cm4gb2JqO1xuXHRcdHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbCwga2V5KSB7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KHZhbCwgJyRrZXknLCB7dmFsdWU6IGtleX0pO1xuXHRcdH0pO1xuXHR9O1xufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY29udGFjdHNBcHAnKVxuLmZpbHRlcigndkNhcmQySlNPTicsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcblx0XHRyZXR1cm4gdkNhcmQucGFyc2UoaW5wdXQpO1xuXHR9O1xufSk7XG4iXX0=
