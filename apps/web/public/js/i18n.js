/**
 * Hospital Queue System - Internationalization (i18n)
 * Supports English (en) and Swahili (sw)
 */

(function() {
    'use strict';
    
    const translations = {
        en: {
            // Navigation
            'nav.dashboard': 'Dashboard',
            'nav.queue': 'Queue',
            'nav.patients': 'Patients',
            'nav.appointments': 'Appointments',
            'nav.messages': 'Messages',
            'nav.notifications': 'Notifications',
            'nav.rooms': 'Rooms',
            'nav.users': 'Users',
            'nav.reports': 'Reports',
            'nav.settings': 'Settings',
            'nav.logout': 'Logout',
            
            // Queue
            'queue.title': 'Queue Management',
            'queue.addPatient': 'Add Patient',
            'queue.callNext': 'Call Next',
            'queue.complete': 'Complete',
            'queue.waiting': 'Waiting',
            'queue.called': 'Called',
            'queue.inProgress': 'In Progress',
            'queue.completed': 'Completed',
            'queue.noShow': 'No Show',
            'queue.position': 'Position',
            'queue.waitTime': 'Wait Time',
            'queue.ticket': 'Ticket #',
            'queue.priority': 'Priority',
            'queue.department': 'Department',
            
            // Patients
            'patients.title': 'Patient Management',
            'patients.add': 'Register Patient',
            'patients.name': 'Full Name',
            'patients.phone': 'Phone Number',
            'patients.email': 'Email',
            'patients.dob': 'Date of Birth',
            'patients.gender': 'Gender',
            'patients.male': 'Male',
            'patients.female': 'Female',
            'patients.save': 'Save Patient',
            'patients.search': 'Search patients...',
            
            // Appointments
            'appointments.title': 'Appointments',
            'appointments.new': 'New Appointment',
            'appointments.date': 'Date',
            'appointments.time': 'Time',
            'appointments.doctor': 'Doctor',
            'appointments.status': 'Status',
            'appointments.scheduled': 'Scheduled',
            'appointments.confirmed': 'Confirmed',
            'appointments.cancelled': 'Cancelled',
            
            // Messages
            'messages.title': 'Messages',
            'messages.compose': 'Compose',
            'messages.inbox': 'Inbox',
            'messages.sent': 'Sent',
            'messages.from': 'From',
            'messages.to': 'To',
            'messages.subject': 'Subject',
            'messages.send': 'Send',
            'messages.reply': 'Reply',
            'messages.unread': 'Unread',
            
            // Common
            'common.loading': 'Loading...',
            'common.save': 'Save',
            'common.cancel': 'Cancel',
            'common.delete': 'Delete',
            'common.edit': 'Edit',
            'common.search': 'Search',
            'common.filter': 'Filter',
            'common.export': 'Export',
            'common.print': 'Print',
            'common.back': 'Back',
            'common.next': 'Next',
            'common.previous': 'Previous',
            'common.success': 'Success',
            'common.error': 'Error',
            'common.confirm': 'Confirm',
            'common.close': 'Close',
            'common.yes': 'Yes',
            'common.no': 'No',
            'common.today': 'Today',
            'common.now': 'Now',
            'common.welcome': 'Welcome',
            
            // Auth
            'auth.login': 'Login',
            'auth.logout': 'Logout',
            'auth.email': 'Email',
            'auth.password': 'Password',
            'auth.rememberMe': 'Remember me',
            'auth.forgotPassword': 'Forgot password?',
            'auth.wrongCredentials': 'Invalid email or password',
            
            // Notifications
            'notifications.title': 'Notifications',
            'notifications.sms': 'Send SMS',
            'notifications.whatsapp': 'Send WhatsApp',
            'notifications.email': 'Send Email',
            'notifications.message': 'Message',
            'notifications.sendSuccess': 'Notification sent successfully',
            'notifications.sendError': 'Failed to send notification',
            
            // Stats
            'stats.totalPatients': 'Total Patients',
            'stats.waiting': 'Waiting',
            'stats.averageWait': 'Avg Wait Time',
            'stats.served': 'Patients Served',
            
            // Doctor Notes
            'notes.title': 'Clinical Notes',
            'notes.soap': 'SOAP Note',
            'notes.subjective': 'Subjective',
            'notes.objective': 'Objective',
            'notes.assessment': 'Assessment',
            'notes.plan': 'Plan',
            'notes.vitals': 'Vitals',
            'notes.diagnosis': 'Diagnosis',
            'notes.prescription': 'Prescription',
            'notes.saveDraft': 'Save Draft',
            'notes.finalize': 'Finalize Note',
            
            // Footer
            'footer.hospital': 'Limuru Cottage Hospital',
            'footer.tagline': 'Quality Healthcare, Close to You'
        },
        
        sw: {
            // Navigation
            'nav.dashboard': 'Dashibodi',
            'nav.queue': 'Safu',
            'nav.patients': 'Wagonjwa',
            'nav.appointments': 'Miadi',
            'nav.messages': 'Ujumbe',
            'nav.notifications': 'Arifa',
            'nav.rooms': 'Vifaa',
            'nav.users': 'Watumiaji',
            'nav.reports': 'Ripoti',
            'nav.settings': 'Mipangilio',
            'nav.logout': 'Toka',
            
            // Queue
            'queue.title': 'Usimamizi wa Safu',
            'queue.addPatient': 'Ongeza Mgonjwa',
            'queue.callNext': 'Fika Mtu Wa IFU',
            'queue.complete': 'Maliza',
            'queue.waiting': 'Inasubiri',
            'queue.called': 'Imeitwa',
            'queue.inProgress': 'Inaendelea',
            'queue.completed': 'Imemalizika',
            'queue.noShow': 'Hakuja',
            'queue.position': 'Nafasi',
            'queue.waitTime': 'Muda wa Kusubiri',
            'queue.ticket': 'Kibali #',
            'queue.priority': 'Kipaumbele',
            'queue.department': 'Idara',
            
            // Patients
            'patients.title': 'Usimamizi wa Wagonjwa',
            'patients.add': 'Sajili Mgonjwa',
            'patients.name': 'Jina Kamili',
            'patients.phone': 'Nambari ya Simu',
            'patients.email': 'Barua Pepe',
            'patients.dob': 'Tarehe ya Kuzaliwa',
            'patients.gender': 'Jinsia',
            'patients.male': 'Mwanaume',
            'patients.female': 'Mwanamke',
            'patients.save': 'Hifadhi Mgonjwa',
            'patients.search': 'Tafuta wagonjwa...',
            
            // Appointments
            'appointments.title': 'Miadi',
            'appointments.new': 'Miadi Mpya',
            'appointments.date': 'Tarehe',
            'appointments.time': 'Saa',
            'appointments.doctor': 'Daktari',
            'appointments.status': 'Hali',
            'appointments.scheduled': 'Imeandikwa',
            'appointments.confirmed': 'Imethibitishwa',
            'appointments.cancelled': 'Imefutwa',
            
            // Messages
            'messages.title': 'Ujumbe',
            'messages.compose': 'Andika',
            'messages.inbox': 'Sanduku la Kukubali',
            'messages.sent': 'Imekwenda',
            'messages.from': 'Kutoka',
            'messages.to': 'Kwa',
            'messages.subject': 'Mada',
            'messages.send': 'Tuma',
            'messages.reply': 'Jibu',
            'messages.unread': 'Haijasomwa',
            
            // Common
            'common.loading': 'Inapakia...',
            'common.save': 'Hifadhi',
            'common.cancel': 'Ghairi',
            'common.delete': 'Futa',
            'common.edit': 'Hariri',
            'common.search': 'Tafuta',
            'common.filter': 'Chuja',
            'common.export': 'Toa',
            'common.print': 'Chapisha',
            'common.back': 'Rudi',
            'common.next': 'Ifuatayo',
            'common.previous': 'Iliyotangulia',
            'common.success': 'Mafanikio',
            'common.error': 'Hitilafu',
            'common.confirm': 'Thibitisha',
            'common.close': 'Funga',
            'common.yes': 'Ndiyo',
            'common.no': 'Hapana',
            'common.today': 'Leo',
            'common.now': 'Sasa',
            'common.welcome': 'Karibu',
            
            // Auth
            'auth.login': 'Ingia',
            'auth.logout': 'Toka',
            'auth.email': 'Barua Pepe',
            'auth.password': 'Nenosiri',
            'auth.rememberMe': 'Kumbuka',
            'auth.forgotPassword': 'Umesahau nenosiri?',
            'auth.wrongCredentials': 'Barua pepe au nenosiri si sahihi',
            
            // Notifications
            'notifications.title': 'Arifa',
            'notifications.sms': 'Tuma SMS',
            'notifications.whatsapp': 'Tuma WhatsApp',
            'notifications.email': 'Tuma Barua Pepe',
            'notifications.message': 'Ujumbe',
            'notifications.sendSuccess': 'Arifa imetumwa kwa mafanikio',
            'notifications.sendError': 'Imeshindwa kutuma arifa',
            
            // Stats
            'stats.totalPatients': 'Wagonjwa Wote',
            'stats.waiting': 'Wanasubiri',
            'stats.averageWait': 'Muda wa Kawaida wa Kusubiri',
            'stats.served': 'Wagonjwa Waliohudumia',
            
            // Doctor Notes
            'notes.title': 'Maelezo ya Kliniki',
            'notes.soap': 'Maelezo ya SOAP',
            'notes.subjective': 'Maoni ya Mgonjwa',
            'notes.objective': 'Maoni ya Daktari',
            'notes.assessment': 'Tathmini',
            'notes.plan': 'Mipango',
            'notes.vitals': 'Vita',
            'notes.diagnosis': 'Ugunduzi',
            'notes.prescription': 'Dawa',
            'notes.saveDraft': 'Hifadhi Rasimu',
            'notes.finalize': 'Maliza Maelezo',
            
            // Footer
            'footer.hospital': 'Hospitali ya Limuru Cottage',
            'footer.tagline': 'Huduma Bora ya Afya, Karibu Nawe'
        }
    };
    
    // i18n module
    const i18n = {
        currentLocale: localStorage.getItem('locale') || 'en',
        
        // Set locale
        setLocale(locale) {
            if (translations[locale]) {
                this.currentLocale = locale;
                localStorage.setItem('locale', locale);
                this.updateDOM();
                document.documentElement.lang = locale;
            }
        },
        
        // Get translation
        t(key, params = {}) {
            const translation = translations[this.currentLocale]?.[key] 
                || translations.en[key] 
                || key;
            
            // Replace parameters like {{name}}
            return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        },
        
        // Update DOM with translations
        updateDOM() {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = this.t(key);
            });
            
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                el.placeholder = this.t(key);
            });
        },
        
        // Get available locales
        getLocales() {
            return Object.keys(translations).map(code => ({
                code,
                name: code === 'en' ? 'English' : 'Kiswahili'
            }));
        }
    };
    
    // Language switcher UI
    i18n.createSwitcher = function() {
        const switcher = document.createElement('div');
        switcher.className = 'language-switcher';
        switcher.innerHTML = `
            <select id="localeSelect" style="padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: var(--bg-secondary); color: var(--text-primary);">
                ${this.getLocales().map(loc => `
                    <option value="${loc.code}" ${loc.code === this.currentLocale ? 'selected' : ''}>
                        ${loc.name}
                    </option>
                `).join('')}
            </select>
        `;
        
        switcher.querySelector('select').addEventListener('change', (e) => {
            this.setLocale(e.target.value);
        });
        
        return switcher;
    };
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
        i18n.updateDOM();
    });
    
    // Make globally available
    window.i18n = i18n;
    
})();
