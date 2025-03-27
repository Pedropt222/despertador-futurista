class FuturisticAlarmClock {
    constructor() {
        this.alarms = [];
        this.activeAlarm = null;
        this.use24Hour = true;
        this.selectedSound = 'morning-melody';
        this.volume = 0.5;
        this.audioContext = null;
        this.currentTestSound = null;
        this.alarmTimeout = null;
        this.init();
    }

    initAudioContext() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        } catch (error) {
            console.error('Web Audio API não suportada:', error);
            alert('Seu navegador não suporta a Web Audio API. Os sons podem não funcionar corretamente.');
        }
    }

    createSound(type, frequency, duration) {
        if (!this.audioContext) {
            this.initAudioContext();
            if (!this.audioContext) return null;
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        return { oscillator, gainNode };
    }

    init() {
        // Elementos do DOM
        this.timeDisplay = document.querySelector('.current-time');
        this.dateDisplay = document.querySelector('.date');
        this.timezoneDisplay = document.getElementById('timezone');
        this.alarmInput = document.getElementById('alarmTime');
        this.alarmLabelInput = document.getElementById('alarmLabel');
        this.alarmSoundInput = document.getElementById('alarmSound');
        this.volumeControl = document.getElementById('volumeControl');
        this.setAlarmBtn = document.getElementById('setAlarm');
        this.stopAlarmBtn = document.getElementById('stopAlarm');
        this.activeAlarmsList = document.getElementById('activeAlarms');
        this.toggleThemeBtn = document.getElementById('toggleTheme');
        this.toggleFormatBtn = document.getElementById('toggleFormat');
        this.openThemeCustomizerBtn = document.getElementById('openThemeCustomizer');
        this.themeCustomizer = document.getElementById('themeCustomizer');
        this.saveThemeBtn = document.getElementById('saveTheme');
        this.closeThemeCustomizerBtn = document.getElementById('closeThemeCustomizer');
        this.primaryColorInput = document.getElementById('primaryColor');
        this.secondaryColorInput = document.getElementById('secondaryColor');
        this.backgroundColorInput = document.getElementById('backgroundColor');

        // Configurar input de hora
        if (this.alarmInput) {
            this.alarmInput.addEventListener('input', (e) => {
                let value = e.target.value;
                
                // Remove tudo que não é número
                value = value.replace(/[^\d]/g, '');
                
                // Formata como hora:minuto
                if (value.length >= 4) {
                    let hours = value.substring(0, 2);
                    let minutes = value.substring(2, 4);
                    
                    // Validar horas e minutos
                    hours = Math.min(Math.max(0, parseInt(hours) || 0), 23);
                    minutes = Math.min(Math.max(0, parseInt(minutes) || 0), 59);
                    
                    // Formatar com zeros à esquerda
                    hours = hours.toString().padStart(2, '0');
                    minutes = minutes.toString().padStart(2, '0');
                    
                    value = `${hours}:${minutes}`;
                } else if (value.length >= 2) {
                    value = value.substring(0, 2) + ':' + value.substring(2);
                }
                
                e.target.value = value;
            });

            // Validar ao perder o foco
            this.alarmInput.addEventListener('blur', (e) => {
                const value = e.target.value;
                if (value && !value.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
                    e.target.value = '';
                    alert('Por favor, insira um horário válido no formato 24h (00:00 - 23:59)');
                }
            });
        }

        // Configurar quick timers
        document.querySelectorAll('.quick-timer button').forEach(btn => {
            btn.addEventListener('click', () => this.setQuickTimer(parseInt(btn.dataset.time)));
        });

        // Event listeners
        this.setAlarmBtn.addEventListener('click', () => this.setAlarm());
        this.stopAlarmBtn.addEventListener('click', () => this.stopAlarm());
        this.toggleThemeBtn.addEventListener('click', () => this.toggleTheme());
        this.toggleFormatBtn.addEventListener('click', () => this.toggleTimeFormat());
        this.volumeControl.addEventListener('input', (e) => this.updateVolume(e.target.value));
        
        // Event listeners do personalizador de tema
        this.openThemeCustomizerBtn.addEventListener('click', () => this.openThemeCustomizer());
        this.closeThemeCustomizerBtn.addEventListener('click', () => this.closeThemeCustomizer());
        this.saveThemeBtn.addEventListener('click', () => this.saveCustomTheme());

        // Fechar modal ao clicar fora
        this.themeCustomizer.addEventListener('click', (e) => {
            if (e.target === this.themeCustomizer) {
                this.closeThemeCustomizer();
            }
        });

        // Adicionar evento para testar som do alarme
        document.querySelector('.play-sound-mini').addEventListener('click', () => {
            const selectedSound = document.getElementById('alarmSound').value;
            this.playTestSound(selectedSound);
        });

        // Inicializar relógio
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);

        // Carregar preferências e alarmes salvos
        this.loadPreferences();
        this.loadAlarms();

        // Verificar permissão de notificações
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        // Atualizar timezone
        this.updateTimezone();

        // Configurar teclas de atalho
        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Esc fecha o modal
            if (e.key === 'Escape' && !this.themeCustomizer.classList.contains('hidden')) {
                this.closeThemeCustomizer();
            }

            // Ctrl/Cmd + Shift + T abre o personalizador de tema
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                if (this.themeCustomizer.classList.contains('hidden')) {
                    this.openThemeCustomizer();
                } else {
                    this.closeThemeCustomizer();
                }
            }

            // Espaço para parar o alarme ativo
            if (e.code === 'Space' && this.activeAlarm) {
                e.preventDefault();
                this.stopAlarm();
            }
        });
    }

    updateVolume(value) {
        this.volume = value / 100;
        this.savePreferences();
    }

    openThemeCustomizer() {
        this.themeCustomizer.classList.remove('hidden');
        this.primaryColorInput.focus();
    }

    closeThemeCustomizer() {
        this.themeCustomizer.classList.add('hidden');
    }

    saveCustomTheme() {
        const root = document.documentElement;
        const primaryColor = this.primaryColorInput.value;
        const secondaryColor = this.secondaryColorInput.value;
        const backgroundColor = this.backgroundColorInput.value;

        root.style.setProperty('--primary-color', primaryColor);
        root.style.setProperty('--secondary-color', secondaryColor);
        root.style.setProperty('--background-color', backgroundColor);

        // Salvar no localStorage
        localStorage.setItem('customTheme', JSON.stringify({
            primaryColor,
            secondaryColor,
            backgroundColor
        }));

        this.closeThemeCustomizer();
    }

    updateTime() {
        const now = new Date();
        
        // Atualizar hora sempre no formato selecionado (12h ou 24h)
        const timeOptions = { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: !this.use24Hour 
        };
        this.timeDisplay.textContent = now.toLocaleTimeString('pt-BR', timeOptions);
        
        // Atualizar data
        const dateOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        this.dateDisplay.textContent = now.toLocaleDateString('pt-BR', dateOptions);

        // Verificar alarmes a cada segundo
        this.checkAlarms(now);
    }

    updateTimezone() {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        this.timezoneDisplay.textContent = timezone;
    }

    setQuickTimer(minutes) {
        const now = new Date();
        const alarmTime = new Date(now.getTime() + minutes * 60000);

        const alarm = {
            id: Date.now(),
            time: alarmTime,
            active: true,
            label: `Timer de ${minutes} minutos`,
            isQuickTimer: true
        };

        this.alarms.push(alarm);
        this.saveAlarms();
        this.renderAlarms();
    }

    setAlarm() {
        const time = this.alarmInput.value;
        const label = this.alarmLabelInput.value;
        const sound = this.alarmSoundInput.value;

        if (!time || !time.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
            alert('Por favor, insira um horário válido no formato 24h (00:00 - 23:59).');
            return;
        }

        const [hours, minutes] = time.split(':').map(Number);
        const now = new Date();
        const alarmTime = new Date();
        alarmTime.setHours(hours);
        alarmTime.setMinutes(minutes);
        alarmTime.setSeconds(0);
        alarmTime.setMilliseconds(0);

        // Se o horário já passou hoje, agendar para amanhã
        if (alarmTime <= now) {
            alarmTime.setDate(alarmTime.getDate() + 1);
        }

        const alarm = {
            id: Date.now(),
            time: alarmTime,
            label: label || 'Alarme',
            sound: sound,
            isQuickTimer: false
        };

        this.alarms.push(alarm);
        this.saveAlarms();
        this.renderAlarms();

        // Limpar os campos
        this.alarmInput.value = '';
        this.alarmLabelInput.value = '';

        // Mostrar confirmação
        alert(`Alarme definido para ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }

    toggleTimeFormat() {
        this.use24Hour = !this.use24Hour;
        this.savePreferences();
        this.updateTime();
    }

    checkAlarms(now) {
        if (this.activeAlarm) return; // Se já tem um alarme tocando, não verifica outros

        this.alarms.forEach(alarm => {
            const alarmTime = new Date(alarm.time);
            
            // Compara apenas hora e minuto
            if (now.getHours() === alarmTime.getHours() && 
                now.getMinutes() === alarmTime.getMinutes() &&
                now.getSeconds() === 0) {
                
                this.triggerAlarm(alarm);
            }
        });
    }

    triggerAlarm(alarm) {
        this.activeAlarm = alarm;
        document.body.classList.add('alarm-active');
        this.stopAlarmBtn.classList.remove('hidden');
        
        // Configurações de som baseadas na seleção
        let soundConfig;
        switch (alarm.sound) {
            case 'morning-melody':
                soundConfig = {
                    notes: [
                        { freq: 523.25, duration: 0.2 }, // C5
                        { freq: 587.33, duration: 0.2 }, // D5
                        { freq: 659.25, duration: 0.2 }, // E5
                        { freq: 698.46, duration: 0.4 }  // F5
                    ],
                    gap: 0.1,
                    pattern: 1
                };
                break;
            case 'gentle-chimes':
                soundConfig = {
                    notes: [
                        { freq: 783.99, duration: 0.3 }, // G5
                        { freq: 659.25, duration: 0.3 }, // E5
                        { freq: 523.25, duration: 0.4 }  // C5
                    ],
                    gap: 0.15,
                    pattern: 1
                };
                break;
            case 'cyber-dream':
                soundConfig = {
                    notes: [
                        { freq: 440.00, duration: 0.2 }, // A4
                        { freq: 554.37, duration: 0.2 }, // C#5
                        { freq: 659.25, duration: 0.3 }  // E5
                    ],
                    gap: 0.1,
                    pattern: 1
                };
                break;
            case 'space-signal':
                soundConfig = {
                    notes: [
                        { freq: 392.00, duration: 0.3 }, // G4
                        { freq: 493.88, duration: 0.3 }, // B4
                        { freq: 587.33, duration: 0.4 }  // D5
                    ],
                    gap: 0.2,
                    pattern: 1
                };
                break;
            case 'digital-bells':
                soundConfig = {
                    notes: [
                        { freq: 880.00, duration: 0.2 }, // A5
                        { freq: 739.99, duration: 0.2 }, // F#5
                        { freq: 659.25, duration: 0.2 }, // E5
                        { freq: 587.33, duration: 0.3 }  // D5
                    ],
                    gap: 0.1,
                    pattern: 1
                };
                break;
            case 'crystal-tune':
                soundConfig = {
                    notes: [
                        { freq: 987.77, duration: 0.2 }, // B5
                        { freq: 783.99, duration: 0.2 }, // G5
                        { freq: 659.25, duration: 0.3 }  // E5
                    ],
                    gap: 0.15,
                    pattern: 1
                };
                break;
            case 'tech-lullaby':
                soundConfig = {
                    notes: [
                        { freq: 523.25, duration: 0.3 }, // C5
                        { freq: 466.16, duration: 0.3 }, // Bb4
                        { freq: 392.00, duration: 0.4 }  // G4
                    ],
                    gap: 0.2,
                    pattern: 1
                };
                break;
            case 'star-chimes':
                soundConfig = {
                    notes: [
                        { freq: 739.99, duration: 0.2 }, // F#5
                        { freq: 659.25, duration: 0.2 }, // E5
                        { freq: 587.33, duration: 0.2 }, // D5
                        { freq: 523.25, duration: 0.3 }  // C5
                    ],
                    gap: 0.1,
                    pattern: 1
                };
                break;
            case 'quantum-melody':
                soundConfig = {
                    notes: [
                        { freq: 659.25, duration: 0.2 }, // E5
                        { freq: 783.99, duration: 0.2 }, // G5
                        { freq: 987.77, duration: 0.3 }  // B5
                    ],
                    gap: 0.15,
                    pattern: 1
                };
                break;
            case 'neon-music':
                soundConfig = {
                    notes: [
                        { freq: 587.33, duration: 0.2 }, // D5
                        { freq: 739.99, duration: 0.2 }, // F#5
                        { freq: 880.00, duration: 0.2 }, // A5
                        { freq: 1046.50, duration: 0.3 } // C6
                    ],
                    gap: 0.1,
                    pattern: 1
                };
                break;
            default:
                soundConfig = {
                    notes: [
                        { freq: 523.25, duration: 0.2 }, // C5
                        { freq: 587.33, duration: 0.2 }, // D5
                        { freq: 659.25, duration: 0.2 }, // E5
                        { freq: 698.46, duration: 0.4 }  // F5
                    ],
                    gap: 0.1,
                    pattern: 1
                };
        }

        let currentNote = 0;
        let totalDuration = 0;

        const playNote = () => {
            if (!this.audioContext) {
                this.initAudioContext();
            }

            if (!this.audioContext || !this.activeAlarm) return;

            const note = soundConfig.notes[currentNote];
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(note.freq, this.audioContext.currentTime);

            gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.duration);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + note.duration);

            currentNote = (currentNote + 1) % soundConfig.notes.length;

            // Calcular o tempo total da melodia
            if (currentNote === 0) {
                totalDuration = soundConfig.notes.reduce((sum, n) => sum + n.duration, 0) + soundConfig.gap;
            }

            // Programar próxima nota
            this.alarmTimeout = setTimeout(() => {
                if (this.activeAlarm) {
                    playNote();
                }
            }, note.duration * 1000 + (currentNote === 0 ? 1000 : soundConfig.gap * 1000));
        };

        // Iniciar a sequência de notas
        playNote();

        // Mostrar notificação
        if (Notification.permission === "granted") {
            new Notification("Alarme!", {
                body: alarm.label,
                icon: "/favicon.ico",
                requireInteraction: true
            });
        }

        // Destacar visualmente o alarme ativo
        this.renderAlarms();
    }

    stopAlarm() {
        if (this.activeAlarm) {
            // Parar o loop do som
            if (this.alarmTimeout) {
                clearTimeout(this.alarmTimeout);
                this.alarmTimeout = null;
            }

            // Parar e limpar o contexto de áudio
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            
            this.activeAlarm = null;
            document.body.classList.remove('alarm-active');
            this.stopAlarmBtn.classList.add('hidden');
            
            // Se for um timer rápido, remover da lista
            this.alarms = this.alarms.filter(a => !a.isQuickTimer);
            
            // Atualizar a lista de alarmes
            this.saveAlarms();
            this.renderAlarms();
        }
    }

    renderAlarms() {
        this.activeAlarmsList.innerHTML = '';
        this.alarms.forEach(alarm => {
            const li = document.createElement('li');
            
            // Sempre usar formato 24h para exibir os alarmes
            const hours = alarm.time.getHours();
            const minutes = alarm.time.getMinutes();
            const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            li.innerHTML = `
                <div class="alarm-info">
                    <span class="alarm-time">${timeStr}</span>
                    <span class="alarm-label">${alarm.label}</span>
                </div>
                <button class="neon-button" onclick="alarmClock.deleteAlarm(${alarm.id})">Excluir</button>
            `;
            this.activeAlarmsList.appendChild(li);
        });
    }

    deleteAlarm(id) {
        this.alarms = this.alarms.filter(alarm => alarm.id !== id);
        this.saveAlarms();
        this.renderAlarms();
    }

    saveAlarms() {
        const alarmsToSave = this.alarms.map(alarm => ({
            ...alarm,
            time: alarm.time.toISOString() // Salva a data em formato ISO
        }));
        localStorage.setItem('alarms', JSON.stringify(alarmsToSave));
    }

    loadAlarms() {
        const savedAlarms = localStorage.getItem('alarms');
        if (savedAlarms) {
            try {
                this.alarms = JSON.parse(savedAlarms).map(alarm => ({
                    ...alarm,
                    time: new Date(alarm.time) // Converte a string ISO de volta para Date
                }));
                // Remove alarmes inválidos
                this.alarms = this.alarms.filter(alarm => !isNaN(alarm.time.getTime()));
                this.renderAlarms();
            } catch (error) {
                console.error('Erro ao carregar alarmes:', error);
                this.alarms = [];
                localStorage.removeItem('alarms');
            }
        }
    }

    playTestSound(soundType) {
        // Parar som de teste anterior se existir
        if (this.currentTestSound) {
            clearTimeout(this.currentTestSound.timeout);
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
        }

        // Configurações de som baseadas na seleção
        let soundConfig;
        switch (soundType) {
            case 'morning-melody':
                soundConfig = {
                    notes: [
                        { freq: 523.25, duration: 0.2 }, // C5
                        { freq: 587.33, duration: 0.2 }, // D5
                        { freq: 659.25, duration: 0.2 }, // E5
                        { freq: 698.46, duration: 0.4 }  // F5
                    ],
                    gap: 0.1
                };
                break;
            case 'gentle-chimes':
                soundConfig = {
                    notes: [
                        { freq: 783.99, duration: 0.3 }, // G5
                        { freq: 659.25, duration: 0.3 }, // E5
                        { freq: 523.25, duration: 0.4 }  // C5
                    ],
                    gap: 0.15
                };
                break;
            case 'cyber-dream':
                soundConfig = {
                    notes: [
                        { freq: 440.00, duration: 0.2 }, // A4
                        { freq: 554.37, duration: 0.2 }, // C#5
                        { freq: 659.25, duration: 0.3 }  // E5
                    ],
                    gap: 0.1
                };
                break;
            case 'space-signal':
                soundConfig = {
                    notes: [
                        { freq: 392.00, duration: 0.3 }, // G4
                        { freq: 493.88, duration: 0.3 }, // B4
                        { freq: 587.33, duration: 0.4 }  // D5
                    ],
                    gap: 0.2
                };
                break;
            case 'digital-bells':
                soundConfig = {
                    notes: [
                        { freq: 880.00, duration: 0.2 }, // A5
                        { freq: 739.99, duration: 0.2 }, // F#5
                        { freq: 659.25, duration: 0.2 }, // E5
                        { freq: 587.33, duration: 0.3 }  // D5
                    ],
                    gap: 0.1
                };
                break;
            case 'crystal-tune':
                soundConfig = {
                    notes: [
                        { freq: 987.77, duration: 0.2 }, // B5
                        { freq: 783.99, duration: 0.2 }, // G5
                        { freq: 659.25, duration: 0.3 }  // E5
                    ],
                    gap: 0.15
                };
                break;
            case 'tech-lullaby':
                soundConfig = {
                    notes: [
                        { freq: 523.25, duration: 0.3 }, // C5
                        { freq: 466.16, duration: 0.3 }, // Bb4
                        { freq: 392.00, duration: 0.4 }  // G4
                    ],
                    gap: 0.2
                };
                break;
            case 'star-chimes':
                soundConfig = {
                    notes: [
                        { freq: 739.99, duration: 0.2 }, // F#5
                        { freq: 659.25, duration: 0.2 }, // E5
                        { freq: 587.33, duration: 0.2 }, // D5
                        { freq: 523.25, duration: 0.3 }  // C5
                    ],
                    gap: 0.1
                };
                break;
            case 'quantum-melody':
                soundConfig = {
                    notes: [
                        { freq: 659.25, duration: 0.2 }, // E5
                        { freq: 783.99, duration: 0.2 }, // G5
                        { freq: 987.77, duration: 0.3 }  // B5
                    ],
                    gap: 0.15
                };
                break;
            case 'neon-music':
                soundConfig = {
                    notes: [
                        { freq: 587.33, duration: 0.2 }, // D5
                        { freq: 739.99, duration: 0.2 }, // F#5
                        { freq: 880.00, duration: 0.2 }, // A5
                        { freq: 1046.50, duration: 0.3 } // C6
                    ],
                    gap: 0.1
                };
                break;
            default:
                soundConfig = {
                    notes: [
                        { freq: 523.25, duration: 0.2 }, // C5
                        { freq: 587.33, duration: 0.2 }, // D5
                        { freq: 659.25, duration: 0.2 }, // E5
                        { freq: 698.46, duration: 0.4 }  // F5
                    ],
                    gap: 0.1
                };
        }

        if (!this.audioContext) {
            this.initAudioContext();
        }

        if (!this.audioContext) return;

        // Tocar a sequência de notas para teste
        const playTestNote = (noteIndex) => {
            if (noteIndex >= soundConfig.notes.length) return;

            const note = soundConfig.notes[noteIndex];
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(note.freq, this.audioContext.currentTime);

            gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.duration);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + note.duration);

            this.currentTestSound = {
                timeout: setTimeout(() => {
                    playTestNote(noteIndex + 1);
                }, note.duration * 1000 + soundConfig.gap * 1000)
            };
        };

        playTestNote(0);
    }

    savePreferences() {
        localStorage.setItem('preferences', JSON.stringify({
            use24Hour: this.use24Hour,
            selectedSound: this.selectedSound,
            volume: this.volume,
            customTheme: {
                primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
                secondaryColor: getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim(),
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background-color').trim()
            }
        }));
    }

    loadPreferences() {
        const savedPrefs = localStorage.getItem('preferences');
        if (savedPrefs) {
            const prefs = JSON.parse(savedPrefs);
            this.use24Hour = prefs.use24Hour;
            this.selectedSound = prefs.selectedSound || 'morning-melody';
            this.volume = prefs.volume ?? 0.5;
            this.volumeControl.value = this.volume * 100;

            // Carregar tema personalizado
            if (prefs.customTheme) {
                const root = document.documentElement;
                root.style.setProperty('--primary-color', prefs.customTheme.primaryColor);
                root.style.setProperty('--secondary-color', prefs.customTheme.secondaryColor);
                root.style.setProperty('--background-color', prefs.customTheme.backgroundColor);

                // Atualizar inputs do personalizador
                this.primaryColorInput.value = prefs.customTheme.primaryColor;
                this.secondaryColorInput.value = prefs.customTheme.secondaryColor;
                this.backgroundColorInput.value = prefs.customTheme.backgroundColor;
            }
        }
    }

    toggleTheme() {
        const root = document.documentElement;
        const currentPrimary = getComputedStyle(root).getPropertyValue('--primary-color').trim();
        
        if (currentPrimary === '#00ff88') {
            root.style.setProperty('--primary-color', '#ff00ff');
            root.style.setProperty('--secondary-color', '#ff00cc');
            root.style.setProperty('--background-color', '#1a0a2a');
        } else {
            root.style.setProperty('--primary-color', '#00ff88');
            root.style.setProperty('--secondary-color', '#00ccff');
            root.style.setProperty('--background-color', '#0a0a2a');
        }
    }
}

// Solicitar permissão para notificações
if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
}

// Iniciar o aplicativo
const alarmClock = new FuturisticAlarmClock();
