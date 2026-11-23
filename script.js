/**
         * =========================================================================
         * SINTETIZADOR DE ÁUDIO REALISTA VIA WEB AUDIO API
         * Reproduz o clique mecânico da correntinha + estalo do filamento ao acender
         * =========================================================================
         */
        class PullCordAudioEngine {
            constructor() {
                this.ctx = null;
            }

            initContext() {
                if (!this.ctx) {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    this.ctx = new AudioContextClass();
                }
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            }

            playPullAndIgnite() {
                try {
                    this.initContext();
                    const now = this.ctx.currentTime;

                    // 1. Som metálico da correntinha deslizando + clique interno do interruptor
                    const clickBufferSize = Math.floor(this.ctx.sampleRate * 0.045);
                    const clickBuffer = this.ctx.createBuffer(1, clickBufferSize, this.ctx.sampleRate);
                    const data = clickBuffer.getChannelData(0);
                    for (let i = 0; i < clickBufferSize; i++) {
                        const env = Math.exp(-i / (this.ctx.sampleRate * 0.005));
                        data[i] = (Math.random() * 2 - 1) * env;
                    }

                    const noiseSource = this.ctx.createBufferSource();
                    noiseSource.buffer = clickBuffer;

                    const bandpass = this.ctx.createBiquadFilter();
                    bandpass.type = 'bandpass';
                    bandpass.frequency.setValueAtTime(1950, now);
                    bandpass.Q.setValueAtTime(2.4, now);

                    const clickGain = this.ctx.createGain();
                    clickGain.gain.setValueAtTime(0.9, now);
                    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.045);

                    noiseSource.connect(bandpass);
                    bandpass.connect(clickGain);
                    clickGain.connect(this.ctx.destination);
                    noiseSource.start(now);

                    // 2. Impacto grave da mola do soquete
                    const springOsc = this.ctx.createOscillator();
                    const springGain = this.ctx.createGain();
                    springOsc.type = 'triangle';
                    springOsc.frequency.setValueAtTime(210, now);
                    springOsc.frequency.exponentialRampToValueAtTime(52, now + 0.035);
                    springGain.gain.setValueAtTime(0.5, now);
                    springGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

                    springOsc.connect(springGain);
                    springGain.connect(this.ctx.destination);
                    springOsc.start(now);
                    springOsc.stop(now + 0.04);

                    // 3. Breve faísca / zumbido inicial do filamento aquecendo
                    const sparkTime = now + 0.05;
                    const sparkOsc = this.ctx.createOscillator();
                    const sparkGain = this.ctx.createGain();
                    sparkOsc.type = 'sawtooth';
                    sparkOsc.frequency.setValueAtTime(880, sparkTime);
                    sparkOsc.frequency.exponentialRampToValueAtTime(180, sparkTime + 0.09);

                    sparkGain.gain.setValueAtTime(0.085, sparkTime);
                    sparkGain.gain.exponentialRampToValueAtTime(0.0008, sparkTime + 0.095);

                    sparkOsc.connect(sparkGain);
                    sparkGain.connect(this.ctx.destination);
                    sparkOsc.start(sparkTime);
                    sparkOsc.stop(sparkTime + 0.1);
                } catch (e) {
                    // Ignora silenciosamente se o navegador bloquear áudio
                }
            }
        }

        const audioEngine = new PullCordAudioEngine();

        // Referências da Cordinha e da Luz
        const pullCordAssembly = document.getElementById('pullCordAssembly');
        const beadedChain = document.getElementById('beadedChain');
        const cordPrompt = document.getElementById('cordPrompt');
        const lampCircleEl = document.getElementById('lampCircle');
        const deskSceneEl = document.getElementById('deskScene');

        // Referências do Jornal
        const newspaperSection = document.getElementById('newspaperSection');
        const dirtyNewspaperCard = document.getElementById('dirtyNewspaperCard');
        const newspaperModal = document.getElementById('newspaperModal');
        const btnCloseNewspaper = document.getElementById('btnCloseNewspaper');
        const newspaperBadgeStatus = document.getElementById('newspaperBadgeStatus');

        // Referências da Carta e do Formulário interno
        const letterSection = document.getElementById('letterSection');
        const dirtyLetterCard = document.getElementById('dirtyLetterCard');
        const letterModal = document.getElementById('letterModal');
        const btnCloseLetter = document.getElementById('btnCloseLetter');
        const letterBadgeStatus = document.getElementById('letterBadgeStatus');
        const letterCoverSubtitle = document.getElementById('letterCoverSubtitle');
        const letterFooterHint = document.getElementById('letterFooterHint');
        const vintageLetterForm = document.getElementById('vintageLetterForm');
        const characterNameInput = document.getElementById('characterName');
        const characterElementInput = document.getElementById('characterElement');
        const characterHistoryInput = document.getElementById('characterHistory');
        const characterPersonalityInput = document.getElementById('characterPersonality');
        const characterClassInput = document.getElementById('characterClass');
        const characterHeightInput = document.getElementById('characterHeight');
        const characterWeaponsInput = document.getElementById('characterWeapons');
        const characterComplementInput = document.getElementById('characterComplement');
        const formConfirmationBox = document.getElementById('formConfirmationBox');
        const btnClearForm = document.getElementById('btnClearForm');

        const FORM_STORAGE_KEY = 'mesa_luminaria_ficha_personagem_v2';
        let isLampLit = false;
        let hasReadNewspaper = false;
        let isLetterSealed = false;
        let currentNewspaperPage = 1;

        /**
         * Aciona a cordinha SOMENTE ao soltar, recolhe-a para fora da tela e acende a luminária
         */
        function activatePullCord() {
            if (isLampLit) return;
            isLampLit = true;

            beadedChain.style.height = '155px';
            audioEngine.playPullAndIgnite();

            // Retrai a cordinha completamente para fora da tela
            pullCordAssembly.classList.add('retracted-out');

            // Cintilação realista e estabilização do círculo de luz
            lampCircleEl.classList.add('igniting');
            setTimeout(() => {
                lampCircleEl.classList.remove('igniting');
                lampCircleEl.classList.add('on');
            }, 620);

            // Revela primeiro apenas o jornal sobre a mesa
            deskSceneEl.classList.add('illuminated');
            setTimeout(() => {
                newspaperSection.classList.add('is-revealed');
                newspaperSection.removeAttribute('aria-hidden');
                newspaperSection.removeAttribute('inert');
            }, 5000);
        }

        /**
         * Puxar a cordinha estica a corrente; a luz só acende quando a pessoa SOLTAR a corda
         */
        function setupCordInteraction() {
            let startY = null;
            let keyboardPulling = false;

            pullCordAssembly.addEventListener('pointerdown', (e) => {
                if (isLampLit) return;
                startY = e.clientY;
                pullCordAssembly.style.animation = 'none';
                pullCordAssembly.setPointerCapture(e.pointerId);
            });

            pullCordAssembly.addEventListener('pointermove', (e) => {
                if (startY === null || isLampLit) return;
                const deltaY = Math.max(0, Math.min(70, e.clientY - startY));
                beadedChain.style.height = `${155 + deltaY}px`;

                if (deltaY >= 24) {
                    cordPrompt.textContent = 'Solte para acender a luz';
                } else {
                    cordPrompt.textContent = 'Puxe mais para baixo...';
                }
            });

            const handleRelease = (e) => {
                if (startY === null || isLampLit) return;
                const releaseDelta = e.clientY - startY;
                startY = null;

                if (releaseDelta >= 24) {
                    activatePullCord();
                } else {
                    beadedChain.style.height = '155px';
                    cordPrompt.textContent = 'Puxe a cordinha para baixo e solte para acender';
                    pullCordAssembly.style.animation = '';
                }
            };

            pullCordAssembly.addEventListener('pointerup', handleRelease);
            pullCordAssembly.addEventListener('pointercancel', () => {
                if (startY === null || isLampLit) return;
                startY = null;
                beadedChain.style.height = '155px';
                cordPrompt.textContent = 'Puxe a cordinha para baixo e solte para acender';
                pullCordAssembly.style.animation = '';
            });

            pullCordAssembly.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' && !isLampLit && !e.repeat) {
                    e.preventDefault();
                    keyboardPulling = true;
                    beadedChain.style.height = '188px';
                    cordPrompt.textContent = 'Solte para acender a luz';
                }
            });

            pullCordAssembly.addEventListener('keyup', (e) => {
                if (e.key === 'ArrowDown' && keyboardPulling && !isLampLit) {
                    e.preventDefault();
                    keyboardPulling = false;
                    activatePullCord();
                }
            });
        }

        /**
         * Revela a carta aberta na mesa após a leitura do jornal
         */
        function revealOpenLetterOnDesk() {
            if (hasReadNewspaper) return;
            hasReadNewspaper = true;

            letterSection.classList.remove('hidden');
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    letterSection.classList.add('revealed');
                });
            });
        }

        /**
         * Atualiza visualmente a carta para o estado lacrado
         */
        function applySealedStateToLetter() {
            isLetterSealed = true;
            dirtyLetterCard.classList.remove('is-open-letter', 'opening-flap');
            dirtyLetterCard.classList.add('is-sealed-letter');
            letterBadgeStatus.textContent = 'Lacrada ✦';
            letterCoverSubtitle.textContent = '(Registro selado sob a luz da luminária)';
            letterFooterHint.textContent = 'Clique para rever sua resposta';
        }

        /**
         * Restaura visualmente a carta para o estado aberto
         */
        function applyOpenStateToLetter() {
            isLetterSealed = false;
            dirtyLetterCard.classList.remove('is-sealed-letter', 'opening-flap');
            dirtyLetterCard.classList.add('is-open-letter');
            letterBadgeStatus.textContent = 'Aberta';
            letterCoverSubtitle.textContent = '(Clique para escrever e lacrar o envelope)';
            letterFooterHint.textContent = 'Clique para preencher a carta';
        }

        /**
         * Alterna páginas do jornal
         */
        function setNewspaperPage(pageNum) {
            currentNewspaperPage = pageNum === 2 ? 2 : 1;
            const isPage2 = currentNewspaperPage === 2;
            newspaperPage1.classList.toggle('hidden', isPage2);
            newspaperPage2.classList.toggle('hidden', !isPage2);
            newspaperPageIndicator.textContent = isPage2
                ? 'Página 2 de 2 • Caderno de Recortes'
                : 'Página 1 de 2 • Caderno Principal';
        }

        /**
         * Carrega e salva os dados do formulário da carta no localStorage
         */
        function loadSavedFormData() {
            try {
                const raw = localStorage.getItem(FORM_STORAGE_KEY);
                if (!raw) return;
                const data = JSON.parse(raw);
                if (data.characterName) characterNameInput.value = data.characterName;
                if (data.characterElement) characterElementInput.value = data.characterElement;
                if (data.characterHistory) characterHistoryInput.value = data.characterHistory;
                if (data.characterPersonality) characterPersonalityInput.value = data.characterPersonality;
                if (data.characterClass) characterClassInput.value = data.characterClass;
                if (data.characterHeight) characterHeightInput.value = data.characterHeight;
                if (data.characterWeapons) characterWeaponsInput.value = data.characterWeapons;
                if (data.characterComplement) characterComplementInput.value = data.characterComplement;
                if (data.submitted) {
                    applySealedStateToLetter();
                }
            } catch (e) {}
        }

        function persistFormData(submitted = false) {
            try {
                localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
                    characterName: characterNameInput.value,
                    characterElement: characterElementInput.value,
                    characterHistory: characterHistoryInput.value,
                    characterPersonality: characterPersonalityInput.value,
                    characterClass: characterClassInput.value,
                    characterHeight: characterHeightInput.value,
                    characterWeapons: characterWeaponsInput.value,
                    characterComplement: characterComplementInput.value,
                    submitted
                }));
            } catch (e) {}
        }

        document.addEventListener('DOMContentLoaded', () => {
            setupCordInteraction();
            loadSavedFormData();

            // Etapa 1: ao abrir o jornal, inicia a contagem para revelar a carta
            const openNewspaper = () => {
                if (!isLampLit) return;
                newspaperBadgeStatus.textContent = 'Lido ✓';
                newspaperModal.classList.add('open');
                if (!hasReadNewspaper) {
                    setTimeout(revealOpenLetterOnDesk, 3000);
                }
            };
            const closeNewspaper = () => {
                newspaperModal.classList.remove('open');
            };

            dirtyNewspaperCard.addEventListener('click', openNewspaper);
            dirtyNewspaperCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openNewspaper();
                }
            });
            btnCloseNewspaper.addEventListener('click', closeNewspaper);
            newspaperModal.addEventListener('click', (e) => {
                if (e.target === newspaperModal) closeNewspaper();
            });

            // Etapa 2: Interação com a Carta Aberta -> Formulário -> Lacrar ao finalizar
            const openLetterSheet = () => {
                if (!isLampLit || !hasReadNewspaper) return;
                dirtyLetterCard.classList.remove('is-sealed-letter');
                dirtyLetterCard.classList.add('is-open-letter');
                letterModal.classList.add('open');
            };

            const closeLetterSheet = () => {
                letterModal.classList.remove('open');
                if (isLetterSealed) {
                    setTimeout(() => {
                        applySealedStateToLetter();
                    }, 220);
                }
            };

            dirtyLetterCard.addEventListener('click', openLetterSheet);
            dirtyLetterCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLetterSheet();
                }
            });
            btnCloseLetter.addEventListener('click', closeLetterSheet);
            letterModal.addEventListener('click', (e) => {
                if (e.target === letterModal) closeLetterSheet();
            });

            // Salvamento contínuo enquanto edita
            vintageLetterForm.addEventListener('input', () => {
                formConfirmationBox.classList.add('hidden');
                if (isLetterSealed) {
                    applyOpenStateToLetter();
                }
                persistFormData(false);
            });

            // Ao finalizar o formulário, fecha a folha e lacra a carta com cera na mesa
            vintageLetterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                persistFormData(true);
                formConfirmationBox.classList.remove('hidden');

                setTimeout(() => {
                    letterModal.classList.remove('open');
                    setTimeout(() => {
                        applySealedStateToLetter();
                    }, 260);
                }, 700);
            });

            btnClearForm.addEventListener('click', () => {
                vintageLetterForm.reset();
                formConfirmationBox.classList.add('hidden');
                applyOpenStateToLetter();
                try {
                    localStorage.removeItem(FORM_STORAGE_KEY);
                } catch (e) {}
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (letterModal.classList.contains('open')) closeLetterSheet();
                    if (newspaperModal.classList.contains('open')) closeNewspaper();
                }
            });
        });
