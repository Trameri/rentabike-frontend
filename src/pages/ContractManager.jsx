import React, { useEffect, useState, useRef } from 'react'
import { api } from '../services/api.js'
import { useNotifications } from '../Components/NotificationSystem.jsx'

export default function ContractManager(){
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  
  // Stati per modifica contratto
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [editForm, setEditForm] = useState({
    customer: { name: '', phone: '' },
    notes: '',
    startAt: '',
    endAt: ''
  })
  
  // Stati per rientro bici
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedContractForReturn, setSelectedContractForReturn] = useState(null)
  const [itemsToReturn, setItemsToReturn] = useState([])
  
  // Stati per pagamento (solo per collega ufficio)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedContractForPayment, setSelectedContractForPayment] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  
  // Stati per eliminazione contratto
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedContractForDelete, setSelectedContractForDelete] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  
  // Stati per cambio stato (prenotato -> in uso)
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false)
  const [selectedContractForStatusChange, setSelectedContractForStatusChange] = useState(null)
  const [lockDailyRate, setLockDailyRate] = useState(true)
  
  // Stati per modifica prezzo finale
  const [showPriceEditModal, setShowPriceEditModal] = useState(false)
  const [selectedContractForPriceEdit, setSelectedContractForPriceEdit] = useState(null)
  const [customPrice, setCustomPrice] = useState('')
  const [priceReason, setPriceReason] = useState('')
  
  // Stati per visualizzazione immagini documenti
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState({ url: '', title: '' })
  
  // Stati per webcam e foto documenti
  const [showWebcamModal, setShowWebcamModal] = useState(false)
  const [selectedContractForPhoto, setSelectedContractForPhoto] = useState(null)
  const [photoType, setPhotoType] = useState('') // 'front' o 'back'
  const [webcamStream, setWebcamStream] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const { showSuccess, showError, showWarning } = useNotifications()

  // Funzioni per gestire la webcam
  const startWebcam = async () => {
    const constraintsList = [
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' } },
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } },
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: true }
    ]

    for (const constraints of constraintsList) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        setWebcamStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        return // Success, exit
      } catch (error) {
        console.warn('Tentativo fallito con constraints:', constraints, error)
      }
    }

    // If all attempts fail, show error but allow to continue (bypass)
    console.error('Impossibile accedere alla webcam con tutti i tentativi')
    showError('Impossibile accedere alla webcam. Verifica i permessi del browser.')
  }

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop())
      setWebcamStream(null)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    // Imposta dimensioni canvas uguali al video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Disegna il frame corrente del video sul canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Converte in base64
    return canvas.toDataURL('image/jpeg', 0.8)
  }

  const handleTakePhoto = async () => {
    const photoData = capturePhoto()
    if (!photoData) {
      showError('Errore durante la cattura della foto')
      return
    }

    try {
      // Aggiorna il contratto con la nuova foto
      const updateData = {}
      if (photoType === 'front') {
        updateData['customer.idFrontUrl'] = photoData
      } else if (photoType === 'back') {
        updateData['customer.idBackUrl'] = photoData
      }

      await api.put(`/api/contracts/${selectedContractForPhoto._id}`, updateData)
      
      showSuccess(`Foto documento ${photoType === 'front' ? 'fronte' : 'retro'} aggiornata con successo`)
      
      // Ricarica i contratti per vedere la nuova foto
      loadContracts()
      
      // Chiudi il modal
      handleCloseWebcam()
      
    } catch (error) {
      console.error('Errore salvataggio foto:', error)
      showError('Errore durante il salvataggio della foto')
    }
  }

  const handleCloseWebcam = () => {
    stopWebcam()
    setShowWebcamModal(false)
    setSelectedContractForPhoto(null)
    setPhotoType('')
  }

  const openWebcamModal = (contract, type) => {
    setSelectedContractForPhoto(contract)
    setPhotoType(type)
    setShowWebcamModal(true)
  }

  useEffect(() => {
    loadContracts()
  }, [filter])

  // Avvia webcam quando si apre il modal
  useEffect(() => {
    if (showWebcamModal) {
      startWebcam()
    } else {
      stopWebcam()
    }
    
    // Cleanup quando il componente si smonta
    return () => {
      stopWebcam()
    }
  }, [showWebcamModal])



  // VALIDAZIONE CONTRATTO
  const validateContract = (contract) => {
    const errors = []
    
    if (!contract.customer?.name) {
      errors.push('Nome cliente mancante')
    }
    
    if (!contract.items || contract.items.length === 0) {
      errors.push('Nessun item nel contratto')
    }
    
    if (!contract.startAt) {
      errors.push('Data inizio mancante')
    }
    
    contract.items?.forEach((item, index) => {
      if (!item.name) {
        errors.push(`Item ${index + 1}: nome mancante`)
      }
      if (!item.priceHourly && !item.priceDaily) {
        errors.push(`Item ${index + 1}: prezzi mancanti`)
      }
    })
    
    return errors
  }

  const loadContracts = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? { status: filter } : {}
      const { data } = await api.get('/api/contracts', { params })
      
      // Carica le foto delle bici per ogni contratto
      const contractsWithPhotos = await Promise.all(
        data.map(async (contract) => {
          const itemsWithPhotos = await Promise.all(
            contract.items.map(async (item) => {
              if (item.kind === 'bike' && item.refId && !item.photoUrl) {
                try {
                  const bikeResponse = await api.get(`/api/bikes/${item.refId}`)
                  return { ...item, photoUrl: bikeResponse.data.photoUrl || null }
                } catch (error) {
                  console.warn(`Errore caricamento foto bici ${item.refId}:`, error)
                  return item
                }
              }
              return item
            })
          )
          return { ...contract, items: itemsWithPhotos }
        })
      )
      
      // Valida i contratti e mostra eventuali warning
      const contractsWithValidation = contractsWithPhotos.map(contract => {
        const errors = validateContract(contract)
        return { ...contract, validationErrors: errors }
      })
      
      const invalidContracts = contractsWithValidation.filter(c => c.validationErrors.length > 0)
      if (invalidContracts.length > 0) {
        console.warn(`${invalidContracts.length} contratti con problemi di validazione:`, invalidContracts)
        showWarning(`⚠️ ${invalidContracts.length} contratti hanno dati incompleti`)
      }
      
      setContracts(contractsWithValidation)
    } catch (error) {
      console.error('Errore caricamento contratti:', error)
      showError(`Errore caricamento contratti: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // STEP 1: MODIFICA CONTRATTO
  const openEditModal = (contract) => {
    setEditingContract(contract)
    setEditForm({
      customer: { 
        name: contract.customer?.name || '', 
        phone: contract.customer?.phone || '' 
      },
      notes: contract.notes || '',
      startAt: contract.startAt ? new Date(contract.startAt).toISOString().slice(0, 16) : '',
      endAt: contract.endAt ? new Date(contract.endAt).toISOString().slice(0, 16) : ''
    })
    setShowEditModal(true)
  }

  const handleUpdateContract = async () => {
    if (!editingContract) {
      showError('Nessun contratto selezionato per la modifica')
      return
    }
    
    // Validazione form
    if (!editForm.customer.name.trim()) {
      showError('Il nome del cliente è obbligatorio')
      return
    }
    
    if (!editForm.startAt) {
      showError('La data di inizio è obbligatoria')
      return
    }
    
    setLoading(true)
    try {
      const updateData = {
        customer: {
          name: editForm.customer.name.trim(),
          phone: editForm.customer.phone.trim()
        },
        notes: editForm.notes.trim(),
        startAt: new Date(editForm.startAt).toISOString()
      }
      
      if (editForm.endAt) {
        updateData.endAt = new Date(editForm.endAt).toISOString()
        
        // Verifica che la data di fine sia dopo quella di inizio
        if (new Date(editForm.endAt) <= new Date(editForm.startAt)) {
          showError('La data di fine deve essere successiva a quella di inizio')
          return
        }
      }
      
      await api.put(`/api/contracts/${editingContract._id}`, updateData)
      
      const customerName = editForm.customer.name
      showSuccess(`✅ Contratto di ${customerName} aggiornato con successo!`)
      setShowEditModal(false)
      setEditingContract(null)
      setEditForm({ customer: { name: '', phone: '' }, notes: '', startAt: '', endAt: '' })
      await loadContracts()
    } catch (error) {
      console.error('Errore aggiornamento contratto:', error)
      showError(`Errore aggiornamento contratto: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // STEP 2: RIENTRO BICI (una o più alla volta)
  const openReturnModal = (contract) => {
    setSelectedContractForReturn(contract)
    // Inizializza con tutti gli items disponibili per la restituzione
    const returnableItems = contract.items.filter(item => 
      (item.kind === 'bike' || item.kind === 'accessory') && !item.returnedAt
    )
    setItemsToReturn(returnableItems.map(item => ({ 
      ...item, 
      selected: false,
      condition: 'good'
    })))
    setShowReturnModal(true)
  }

  const toggleItemForReturn = (itemId) => {
    setItemsToReturn(prev => 
      prev.map(item => 
        item._id === itemId ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const updateItemCondition = (itemId, condition) => {
    setItemsToReturn(prev => 
      prev.map(item => 
        item._id === itemId ? { ...item, condition } : item
      )
    )
  }

  const processReturns = async () => {
    const selectedItems = itemsToReturn.filter(item => item.selected)
    if (selectedItems.length === 0) {
      showWarning('Seleziona almeno un articolo da restituire')
      return
    }

    setLoading(true)
    try {
      const results = []
      
      // Restituisci tutti gli items selezionati
      for (const item of selectedItems) {
        try {
          await api.post(`/api/contracts/${selectedContractForReturn._id}/return-item`, {
            itemId: item._id,
            returnedAt: new Date().toISOString(),
            condition: item.condition || 'good',
            notes: `Restituito in condizioni: ${item.condition || 'good'}`
          })
          results.push({ success: true, item: item.name })
        } catch (itemError) {
          console.error(`Errore restituzione ${item.name}:`, itemError)
          results.push({ success: false, item: item.name, error: itemError.message })
        }
      }

      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        // Calcola il prezzo finale e aggiorna il contratto solo se ci sono stati successi
        try {
          const bill = calculateDetailedBill(selectedContractForReturn)
          await api.put(`/api/contracts/${selectedContractForReturn._id}`, { 
            finalAmount: bill.finalTotal,
            endAt: new Date().toISOString()
          })
          
          showSuccess(`✅ ${successCount} articoli restituiti con successo. Prezzo bloccato: €${bill.finalTotal.toFixed(2)}`)
        } catch (updateError) {
          console.error('Errore aggiornamento contratto:', updateError)
          showWarning(`${successCount} articoli restituiti, ma errore nell'aggiornamento del prezzo`)
        }
      }
      
      if (failureCount > 0) {
        showError(`❌ ${failureCount} articoli non sono stati restituiti`)
      }
      
      setShowReturnModal(false)
      setSelectedContractForReturn(null)
      setItemsToReturn([])
      await loadContracts()
      
    } catch (error) {
      console.error('Errore generale restituzione:', error)
      showError(`Errore durante la restituzione: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // STEP 3: CALCOLO PREZZO DETTAGLIATO CON NUOVA LOGICA TARIFFE
  const calculateDetailedBill = (contract) => {
    if (!contract || !contract.items || contract.items.length === 0) {
      return { 
        finalTotal: 0, 
        items: [], 
        duration: { hours: 0, days: 0 }, 
        startDate: null, 
        endDate: null,
        priceSource: 'none'
      }
    }
    
    // PRIORITÀ 1: Se c'è un prezzo finale bloccato, usalo
    if (contract.finalAmount && contract.finalAmount > 0) {
      return {
        finalTotal: parseFloat(contract.finalAmount),
        items: [{
          name: '💰 Prezzo Bloccato',
          duration: contract.priceLockedAt ? `Bloccato il ${new Date(contract.priceLockedAt).toLocaleDateString('it-IT')}` : 'Prezzo fisso',
          basePrice: parseFloat(contract.finalAmount),
          insurance: 0,
          total: parseFloat(contract.finalAmount)
        }],
        duration: { hours: 0, days: 0 },
        startDate: new Date(contract.startAt || contract.createdAt),
        endDate: new Date(contract.endAt || new Date()),
        priceSource: 'locked',
        lockedAt: contract.priceLockedAt
      }
    }
    
    // PRIORITÀ 2: Se c'è un prezzo personalizzato dell'ultimo momento
    if (contract.customFinalPrice && contract.customFinalPrice > 0) {
      return {
        finalTotal: parseFloat(contract.customFinalPrice),
        items: [{
          name: '🎯 Prezzo Personalizzato',
          duration: contract.customPriceReason || 'Prezzo modificato manualmente',
          basePrice: parseFloat(contract.customFinalPrice),
          insurance: 0,
          total: parseFloat(contract.customFinalPrice)
        }],
        duration: { hours: 0, days: 0 },
        startDate: new Date(contract.startAt || contract.createdAt),
        endDate: new Date(contract.endAt || new Date()),
        priceSource: 'custom',
        customReason: contract.customPriceReason
      }
    }
    
    // PRIORITÀ 3: Calcolo con NUOVA LOGICA TARIFFE
    const startDate = new Date(contract.startAt || contract.createdAt)
    const endDate = new Date(contract.endAt || new Date())
    const durationMs = Math.max(0, endDate - startDate)
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)))
    const durationDays = Math.max(1, Math.ceil(durationHours / 24))
    
    let totalAmount = 0
    const billItems = []
    
    // NUOVA LOGICA: Contratti prenotati vs contratti nuovi
    const isReservation = contract.status === 'reserved' || contract.isReservation
    
    contract.items.forEach(item => {
      if ((item.kind === 'bike' || item.kind === 'accessory') && !item.returnedAt) {
        let itemTotal = 0
        let duration = ''
        let pricingLogic = ''
        
        // PRIORITÀ 1: Prezzo personalizzato dell'ultimo momento (dal ContractManager)
        const customPrice = parseFloat(item.customPrice) || 0
        if (customPrice > 0) {
          itemTotal = customPrice
          duration = item.customPriceReason || 'Prezzo personalizzato'
          pricingLogic = 'custom'
        } else {
          // PRIORITÀ 2: Prezzi modificati durante stipula o prezzi standard
          const priceHourly = parseFloat(item.priceHourly) || 0
          const priceDaily = parseFloat(item.priceDaily) || 0
          
          // Controlla se i prezzi sono stati modificati rispetto agli originali
          const originalHourly = parseFloat(item.originalPriceHourly) || priceHourly
          const originalDaily = parseFloat(item.originalPriceDaily) || priceDaily
          const isPriceModified = (priceHourly !== originalHourly) || (priceDaily !== originalDaily)
          
          if (isReservation) {
            // LOGICA PRENOTAZIONI: Tariffa sommativa di tutte le tariffe giornaliere (BLOCCATA)
            itemTotal = priceDaily * durationDays
            duration = `${durationDays} giorni (PRENOTAZIONE - Tariffa giornaliera bloccata)`
            pricingLogic = 'reservation_daily_locked'
          } else {
            // LOGICA CONTRATTI NUOVI: Inizia oraria, si blocca quando raggiunge giornaliera
            const hourlyTotal = priceHourly * durationHours
            const dailyTotal = priceDaily * durationDays
            
            if (priceDaily > 0 && hourlyTotal >= dailyTotal) {
              // Quando il costo orario raggiunge o supera quello giornaliero, si blocca sulla tariffa giornaliera
              itemTotal = dailyTotal
              duration = `${durationDays} giorni (Bloccato su tariffa giornaliera)`
              pricingLogic = 'new_contract_daily_capped'
            } else if (priceHourly > 0) {
              // Continua con tariffa oraria
              itemTotal = hourlyTotal
              duration = `${durationHours} ore (Tariffa oraria)`
              pricingLogic = 'new_contract_hourly'
            } else {
              // Fallback su tariffa giornaliera se non c'è oraria
              itemTotal = dailyTotal
              duration = `${durationDays} giorni (Solo tariffa giornaliera disponibile)`
              pricingLogic = 'fallback_daily'
            }
          }
          
          if (isPriceModified) {
            duration += ' (prezzo modificato)'
          }
        }
        
        // Aggiungi assicurazione se presente
        const insuranceAmount = item.insurance ? (parseFloat(item.insuranceFlat) || 5) : 0
        itemTotal += insuranceAmount
        
        totalAmount += itemTotal
        billItems.push({
          name: item.name || 'Item senza nome',
          duration,
          basePrice: itemTotal - insuranceAmount,
          insurance: insuranceAmount,
          total: itemTotal,
          isCustomPrice: customPrice > 0,
          customReason: item.customPriceReason,
          isPriceModified: customPrice === 0 && ((parseFloat(item.priceHourly) !== parseFloat(item.originalPriceHourly)) || (parseFloat(item.priceDaily) !== parseFloat(item.originalPriceDaily))),
          originalPriceHourly: item.originalPriceHourly,
          originalPriceDaily: item.originalPriceDaily,
          currentPriceHourly: item.priceHourly,
          currentPriceDaily: item.priceDaily,
          pricingLogic: pricingLogic,
          isReservation: isReservation
        })
      }
    })
    
    // Aggiungi assicurazione flat del contratto se presente
    if (contract.insuranceFlat && parseFloat(contract.insuranceFlat) > 0) {
      const contractInsurance = parseFloat(contract.insuranceFlat)
      totalAmount += contractInsurance
      billItems.push({
        name: 'Assicurazione Contratto',
        duration: 'Flat',
        basePrice: 0,
        insurance: contractInsurance,
        total: contractInsurance
      })
    }
    
    // Aggiungi eventuali costi extra dell'ultimo momento
    if (contract.extraCharges && Array.isArray(contract.extraCharges)) {
      contract.extraCharges.forEach(charge => {
        const chargeAmount = parseFloat(charge.amount) || 0
        if (chargeAmount !== 0) {
          totalAmount += chargeAmount
          billItems.push({
            name: charge.description || 'Costo Extra',
            duration: charge.reason || 'Aggiunto manualmente',
            basePrice: chargeAmount,
            insurance: 0,
            total: chargeAmount,
            isExtraCharge: true
          })
        }
      })
    }
    
    return {
      finalTotal: Math.round(totalAmount * 100) / 100,
      items: billItems,
      duration: { hours: durationHours, days: durationDays },
      startDate,
      endDate,
      priceSource: 'calculated',
      isReservation: isReservation,
      pricingStrategy: isReservation ? 'reservation_daily_locked' : 'new_contract_flexible'
    }
  }

  // STEP 4: PAGAMENTO (solo per collega ufficio)
  const openPaymentModal = (contract) => {
    setSelectedContractForPayment(contract)
    setPaymentMethod('cash')
    setPaymentNotes('')
    setShowPaymentModal(true)
  }

  const completePayment = async () => {
    if (!selectedContractForPayment) {
      showError('Nessun contratto selezionato per il pagamento')
      return
    }
    
    if (!paymentMethod) {
      showError('Seleziona un metodo di pagamento')
      return
    }
    
    setLoading(true)
    try {
      const bill = calculateDetailedBill(selectedContractForPayment)
      const finalAmount = bill.finalTotal
      
      await api.post(`/api/contracts/${selectedContractForPayment._id}/complete-payment`, {
        paymentMethod,
        paymentNotes: paymentNotes || '',
        finalAmount
      })
      
      showSuccess(`✅ Pagamento di €${finalAmount.toFixed(2)} completato e contratto chiuso!`)
      setShowPaymentModal(false)
      setSelectedContractForPayment(null)
      setPaymentMethod('')
      setPaymentNotes('')
      await loadContracts()
      
    } catch (error) {
      console.error('Errore completamento pagamento:', error)
      showError(`Errore completamento pagamento: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ELIMINAZIONE CONTRATTO
  const openDeleteModal = (contract) => {
    setSelectedContractForDelete(contract)
    setDeleteReason('')
    setShowDeleteModal(true)
  }

  const deleteContract = async () => {
    if (!selectedContractForDelete) {
      showError('Nessun contratto selezionato per l\'eliminazione')
      return
    }
    
    if (!deleteReason.trim()) {
      showWarning('Inserisci un motivo per l\'eliminazione')
      return
    }
    
    setLoading(true)
    try {
      const contractId = selectedContractForDelete._id
      const customerName = selectedContractForDelete.customer?.name || 'Cliente sconosciuto'
      
      await api.delete(`/api/contracts/${contractId}`, {
        data: { reason: deleteReason.trim() }
      })
      
      showSuccess(`🗑️ Contratto di ${customerName} eliminato con successo!`)
      setShowDeleteModal(false)
      setSelectedContractForDelete(null)
      setDeleteReason('')
      await loadContracts()
      
    } catch (error) {
      console.error('Errore eliminazione contratto:', error)
      showError(`Errore eliminazione contratto: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // MODIFICA PREZZO FINALE
  const openPriceEditModal = (contract) => {
    setSelectedContractForPriceEdit(contract)
    const currentBill = calculateDetailedBill(contract)
    setCustomPrice(contract.customFinalPrice?.toString() || currentBill.finalTotal.toString())
    setPriceReason(contract.customPriceReason || '')
    setShowPriceEditModal(true)
  }

  // VISUALIZZAZIONE IMMAGINI DOCUMENTI
  const openImageModal = (imageUrl, title) => {
    setSelectedImage({ url: imageUrl, title })
    setShowImageModal(true)
  }

  const updateCustomPrice = async () => {
    if (!selectedContractForPriceEdit) {
      showError('Nessun contratto selezionato')
      return
    }

    const priceValue = parseFloat(customPrice)
    if (isNaN(priceValue) || priceValue < 0) {
      showError('Inserisci un prezzo valido')
      return
    }

    if (!priceReason.trim()) {
      showError('Inserisci un motivo per la modifica del prezzo')
      return
    }

    setLoading(true)
    try {
      await api.put(`/api/contracts/${selectedContractForPriceEdit._id}`, {
        customFinalPrice: priceValue,
        customPriceReason: priceReason.trim(),
        priceModifiedAt: new Date().toISOString()
      })

      const customerName = selectedContractForPriceEdit.customer?.name || 'Cliente'
      showSuccess(`💰 Prezzo di ${customerName} aggiornato a €${priceValue.toFixed(2)}`)
      setShowPriceEditModal(false)
      setSelectedContractForPriceEdit(null)
      setCustomPrice('')
      setPriceReason('')
      await loadContracts()
    } catch (error) {
      console.error('Errore aggiornamento prezzo:', error)
      showError(`Errore aggiornamento prezzo: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const resetCustomPrice = async () => {
    if (!selectedContractForPriceEdit) return

    setLoading(true)
    try {
      await api.put(`/api/contracts/${selectedContractForPriceEdit._id}`, {
        customFinalPrice: null,
        customPriceReason: null,
        priceModifiedAt: null
      })

      const customerName = selectedContractForPriceEdit.customer?.name || 'Cliente'
      showSuccess(`🔄 Prezzo di ${customerName} ripristinato al calcolo automatico`)
      setShowPriceEditModal(false)
      setSelectedContractForPriceEdit(null)
      setCustomPrice('')
      setPriceReason('')
      await loadContracts()
    } catch (error) {
      console.error('Errore reset prezzo:', error)
      showError(`Errore reset prezzo: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // CAMBIO STATO DA PRENOTATO A IN USO
  const openStatusChangeModal = (contract) => {
    setSelectedContractForStatusChange(contract)
    setLockDailyRate(true)
    setShowStatusChangeModal(true)
  }

  const changeStatusToInUse = async () => {
    if (!selectedContractForStatusChange) {
      showError('Nessun contratto selezionato per il cambio stato')
      return
    }
    
    setLoading(true)
    try {
      const updateData = {
        status: 'in-use',
        actualStartAt: new Date().toISOString()
      }
      
      // Se si vuole bloccare la tariffa giornaliera, calcola il prezzo finale
      if (lockDailyRate) {
        const bill = calculateDetailedBill(selectedContractForStatusChange)
        updateData.finalAmount = bill.finalTotal
        updateData.priceLockedAt = new Date().toISOString()
      }
      
      await api.put(`/api/contracts/${selectedContractForStatusChange._id}`, updateData)
      
      const customerName = selectedContractForStatusChange.customer?.name || 'Cliente'
      const priceMessage = lockDailyRate && updateData.finalAmount 
        ? ` Prezzo bloccato: €${updateData.finalAmount.toFixed(2)}` 
        : ''
      
      showSuccess(`✅ Contratto di ${customerName} attivato!${priceMessage}`)
      setShowStatusChangeModal(false)
      setSelectedContractForStatusChange(null)
      setLockDailyRate(true)
      await loadContracts()
      
    } catch (error) {
      console.error('Errore cambio stato:', error)
      showError(`Errore cambio stato: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }









  const getStatusColor = (status) => {
    switch (status) {
      case 'reserved': return '#f59e0b'
      case 'in-use': return '#10b981'
      case 'returned': return '#3b82f6'
      case 'completed': return '#059669'
      case 'cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'reserved': return '📅 Prenotato'
      case 'in-use': return '🚴 In Uso'
      case 'returned': return '📦 Restituito'
      case 'completed': return '✅ Completato'
      case 'cancelled': return '❌ Annullato'
      default: return status
    }
  }

  const filteredContracts = contracts

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
        {/* Overlay di caricamento globale */}
        {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
              Elaborazione in corso...
            </span>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        color: 'white'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800' }}>
            🏢 Gestione Contratti
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '1.1rem', opacity: 0.9 }}>
            Modifica, Rientri e Pagamenti
          </p>
        </div>
        <button
          onClick={loadContracts}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {loading ? '🔄 Caricamento...' : '🔄 Aggiorna'}
        </button>
      </div>

      {/* Filtri */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '2px solid #e2e8f0'
      }}>
        {['all', 'reserved', 'in-use', 'returned', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '8px 16px',
              background: filter === status ? '#3b82f6' : 'white',
              color: filter === status ? 'white' : '#374151',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {status === 'all' ? '📋 Tutti' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Lista Contratti */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredContracts.map(contract => (
          <div key={contract._id} style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: contract.validationErrors?.length > 0 ? '2px solid #f59e0b' : '2px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            position: 'relative'
          }}>
            {/* Indicatore errori di validazione */}
            {contract.validationErrors?.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#f59e0b',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'help'
              }} title={`Problemi: ${contract.validationErrors.join(', ')}`}>
                ⚠️ {contract.validationErrors.length}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* Info Contratto */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{
                    padding: '4px 12px',
                    background: getStatusColor(contract.status),
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {getStatusLabel(contract.status)}
                  </span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    ID: {contract._id.slice(-8)}
                  </span>
                </div>
                
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', color: '#1e293b' }}>
                  👤 {contract.customer?.name || 'Cliente non specificato'}
                </h3>
                
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                  📞 {contract.customer?.phone || 'Telefono non specificato'}
                </div>

                {/* FOTO DOCUMENTI - SEMPRE VISIBILE */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    📄 Documenti d'Identità
                  </h4>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Documento Fronte */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      padding: '8px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                        FRONTE
                      </div>
                      {(contract.customer?.idFrontUrl || contract.documentPhotos?.idFront) ? (
                        <>
                          <img 
                            src={contract.customer?.idFrontUrl || contract.documentPhotos?.idFront}
                            alt="Documento fronte"
                            style={{
                              width: '100px',
                              height: '65px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '2px solid #10b981',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onClick={() => openImageModal(contract.customer?.idFrontUrl || contract.documentPhotos?.idFront, 'Documento d\'identità - Fronte')}
                          />
                          <button
                            onClick={() => openWebcamModal(contract, 'front')}
                            style={{
                              marginTop: '4px',
                              padding: '2px 6px',
                              background: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            📷 Rifai
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{
                            width: '100px',
                            height: '65px',
                            background: '#fee2e2',
                            border: '2px dashed #ef4444',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: '#dc2626',
                            textAlign: 'center',
                            fontWeight: '600'
                          }}>
                            ❌<br/>MANCANTE
                          </div>
                          <button
                            onClick={() => openWebcamModal(contract, 'front')}
                            style={{
                              marginTop: '4px',
                              padding: '2px 6px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            📷 Scatta
                          </button>
                        </>
                      )}
                    </div>

                    {/* Documento Retro */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      padding: '8px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                        RETRO
                      </div>
                      {(contract.customer?.idBackUrl || contract.documentPhotos?.idBack) ? (
                        <>
                          <img 
                            src={contract.customer?.idBackUrl || contract.documentPhotos?.idBack}
                            alt="Documento retro"
                            style={{
                              width: '100px',
                              height: '65px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '2px solid #10b981',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onClick={() => openImageModal(contract.customer?.idBackUrl || contract.documentPhotos?.idBack, 'Documento d\'identità - Retro')}
                          />
                          <button
                            onClick={() => openWebcamModal(contract, 'back')}
                            style={{
                              marginTop: '4px',
                              padding: '2px 6px',
                              background: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            📷 Rifai
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{
                            width: '100px',
                            height: '65px',
                            background: '#fee2e2',
                            border: '2px dashed #ef4444',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: '#dc2626',
                            textAlign: 'center',
                            fontWeight: '600'
                          }}>
                            ❌<br/>MANCANTE
                          </div>
                          <button
                            onClick={() => openWebcamModal(contract, 'back')}
                            style={{
                              marginTop: '4px',
                              padding: '2px 6px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            📷 Scatta
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items con foto */}
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ fontSize: '14px', color: '#374151' }}>Articoli:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                    {contract.items?.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        background: item.returnedAt ? '#dcfce7' : '#fef3c7',
                        borderRadius: '8px',
                        border: `2px solid ${item.returnedAt ? '#bbf7d0' : '#fde68a'}`
                      }}>
                        {/* Foto bici se disponibile */}
                        {item.kind === 'bike' && item.photoUrl && (
                          <img 
                            src={item.photoUrl}
                            alt={item.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(item.photoUrl, '_blank')}
                          />
                        )}
                        
                        {/* Info item */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: item.returnedAt ? '#166534' : '#92400e'
                          }}>
                            {item.kind === 'bike' ? '🚴' : '🎒'} {item.name}
                            {item.returnedAt && ' ✅'}
                          </div>
                          {item.barcode && (
                            <div style={{
                              fontSize: '10px',
                              color: '#6b7280',
                              fontFamily: 'monospace'
                            }}>
                              {item.barcode}
                            </div>
                          )}
                          {(item.priceHourly || item.priceDaily) && (
                            <div style={{
                              fontSize: '10px',
                              color: '#6b7280'
                            }}>
                              {item.priceDaily ? `€${item.priceDaily}/giorno` : `€${item.priceHourly}/ora`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prezzo finale se disponibile */}
                {contract.finalAmount !== undefined && contract.finalAmount !== null && (
                  <div style={{
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: '#059669',
                    marginTop: '8px'
                  }}>
                    💰 Totale: €{contract.finalAmount.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Azioni */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                
                {/* CAMBIO STATO: PRENOTATO -> IN USO */}
                {contract.status === 'reserved' && (
                  <>
                    <button
                      onClick={() => openStatusChangeModal(contract)}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      🚀 Attiva Contratto
                    </button>
                    
                    {!contract.paymentCompleted && (
                      <button
                        onClick={() => openPaymentModal(contract)}
                        style={{
                          padding: '8px 16px',
                          background: '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        💰 Segna come Pagato
                      </button>
                    )}
                  </>
                )}

                {/* STEP 1: Modifica Contratto */}
                {(contract.status === 'reserved' || contract.status === 'in-use') && (
                  <button
                    onClick={() => openEditModal(contract)}
                    style={{
                      padding: '8px 16px',
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    ✏️ Modifica Contratto
                  </button>
                )}

                {/* STEP 1.5: Modifica Prezzo */}
                {(contract.status === 'reserved' || contract.status === 'in-use' || contract.status === 'returned') && (
                  <button
                    onClick={() => openPriceEditModal(contract)}
                    style={{
                      padding: '8px 16px',
                      background: contract.customFinalPrice ? '#8b5cf6' : '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      position: 'relative'
                    }}
                  >
                    💰 {contract.customFinalPrice ? 'Prezzo Custom' : 'Modifica Prezzo'}
                    {contract.customFinalPrice && (
                      <span style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        !
                      </span>
                    )}
                  </button>
                )}

                {/* STEP 2: Rientro Bici */}
                {contract.status === 'in-use' && (
                  <button
                    onClick={() => openReturnModal(contract)}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    📦 Rientro Bici
                  </button>
                )}

                {/* STEP 3: Pagamento (solo per collega ufficio) */}
                {contract.status === 'returned' && !contract.paymentCompleted && (
                  <button
                    onClick={() => openPaymentModal(contract)}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    💳 Gestisci Pagamento
                  </button>
                )}

                {/* Stato Pagamento */}
                <div style={{
                  fontSize: '12px',
                  color: contract.paymentCompleted || contract.status === 'reserved' || (contract.status === 'returned' && contract.wasReserved) ? '#059669' : '#dc2626',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {contract.status === 'reserved' ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      ✅ Già Pagato 
                      <a 
                        href={`/contracts/${contract._id}/payment-link`} 
                        target="_blank" 
                        style={{ color: '#3b82f6', textDecoration: 'underline' }}
                        title="Link pagamento prenotazione"
                      >
                        🔗
                      </a>
                    </span>
                  ) : contract.status === 'returned' && contract.wasReserved ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      ✅ Già Pagato
                      <span style={{ fontSize: '10px', color: '#6b7280' }}>(prenotazione)</span>
                    </span>
                  ) : contract.paymentCompleted ? '✅ Pagato' : '❌ Non pagato'}
                </div>

                {/* ELIMINAZIONE CONTRATTO */}
                <button
                  onClick={() => openDeleteModal(contract)}
                  style={{
                    padding: '8px 16px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginTop: '8px'
                  }}
                >
                  🗑️ Elimina Contratto
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL MODIFICA CONTRATTO */}
      {showEditModal && editingContract && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.8rem', color: '#1e293b' }}>
              ✏️ Modifica Contratto
            </h2>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Nome Cliente
                </label>
                <input
                  type="text"
                  value={editForm.customer.name}
                  onChange={(e) => setEditForm(prev => ({
                    ...prev,
                    customer: { ...prev.customer, name: e.target.value }
                  }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Telefono Cliente
                </label>
                <input
                  type="text"
                  value={editForm.customer.phone}
                  onChange={(e) => setEditForm(prev => ({
                    ...prev,
                    customer: { ...prev.customer, phone: e.target.value }
                  }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Note
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Data Inizio
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.startAt}
                    onChange={(e) => setEditForm(prev => ({ ...prev, startAt: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Data Fine
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.endAt}
                    onChange={(e) => setEditForm(prev => ({ ...prev, endAt: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Annulla
              </button>
              <button
                onClick={handleUpdateContract}
                style={{
                  padding: '12px 24px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                ✅ Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RIENTRO BICI */}
      {showReturnModal && selectedContractForReturn && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.8rem', color: '#1e293b' }}>
              📦 Rientro Articoli - {selectedContractForReturn.customer?.name}
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                Seleziona gli articoli da restituire. Il prezzo verrà calcolato e bloccato automaticamente.
              </p>

              {itemsToReturn.map(item => (
                <div key={item._id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  background: item.selected ? '#f0f9ff' : 'white'
                }}>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItemForReturn(item._id)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>
                      {item.kind === 'bike' ? '🚴' : '🎒'} {item.name}
                    </div>
                    {item.barcode && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Barcode: {item.barcode}
                      </div>
                    )}
                  </div>

                  {item.selected && (
                    <select
                      value={item.condition}
                      onChange={(e) => updateItemCondition(item._id, e.target.value)}
                      style={{
                        padding: '8px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="excellent">🌟 Eccellente</option>
                      <option value="good">✅ Buono</option>
                      <option value="fair">⚠️ Discreto</option>
                      <option value="poor">❌ Scarso</option>
                      <option value="damaged">🔧 Danneggiato</option>
                    </select>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowReturnModal(false)}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Annulla
              </button>
              <button
                onClick={processReturns}
                disabled={itemsToReturn.filter(item => item.selected).length === 0}
                style={{
                  padding: '12px 24px',
                  background: itemsToReturn.filter(item => item.selected).length > 0 ? '#16a34a' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: itemsToReturn.filter(item => item.selected).length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                📦 Restituisci ({itemsToReturn.filter(item => item.selected).length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGAMENTO (solo per collega ufficio) */}
      {showPaymentModal && selectedContractForPayment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.8rem', color: '#1e293b' }}>
              💳 Gestione Pagamento - {selectedContractForPayment.customer?.name}
            </h2>

            {/* FATTURA DETTAGLIATA */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              border: '2px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: '#1e293b' }}>
                📋 Dettaglio Conto
              </h3>

              {(() => {
                const bill = calculateDetailedBill(selectedContractForPayment)
                return (
                  <>
                    <div style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
                      <div>📅 Dal: {bill.startDate?.toLocaleString('it-IT')}</div>
                      <div>📅 Al: {bill.endDate?.toLocaleString('it-IT')}</div>
                      <div>⏱️ Durata: {bill.duration.hours} ore ({bill.duration.days} giorni)</div>
                      {bill.pricingStrategy && (
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '8px 12px', 
                          background: bill.isReservation ? '#fef3c7' : '#dbeafe',
                          borderRadius: '6px',
                          fontWeight: '600',
                          color: bill.isReservation ? '#92400e' : '#1e40af'
                        }}>
                          🎯 {bill.isReservation ? 'PRENOTAZIONE: Tariffa giornaliera bloccata' : 'CONTRATTO NUOVO: Tariffa flessibile (oraria → giornaliera)'}
                        </div>
                      )}
                    </div>

                    {bill.items.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: '600', 
                            fontSize: '16px',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            {item.kind === 'bike' ? '🚴' : '🎒'} {item.name}
                          </div>
                          
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#6b7280',
                            marginBottom: '6px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: '4px'
                          }}>
                            <div>⏱️ {item.duration}</div>
                            <div>💰 €{item.originalPriceHourly || item.priceHourly}/h</div>
                            <div>📅 €{item.originalPriceDaily || item.priceDaily}/g</div>
                            {item.barcode && <div>🏷️ {item.barcode}</div>}
                          </div>
                          
                          {item.pricingLogic && (
                            <div style={{ 
                              fontSize: '11px', 
                              color: item.isReservation ? '#92400e' : '#1e40af',
                              fontWeight: '500',
                              marginTop: '4px',
                              padding: '4px 8px',
                              background: item.isReservation ? '#fef3c7' : '#dbeafe',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}>
                              {item.pricingLogic === 'reservation_daily_locked' && '🔒 Prenotazione - Tariffa giornaliera bloccata'}
                              {item.pricingLogic === 'new_contract_daily_capped' && '⚡ Bloccato su tariffa giornaliera'}
                              {item.pricingLogic === 'new_contract_hourly' && '⏰ Tariffa oraria attiva'}
                              {item.pricingLogic === 'fallback_daily' && '📅 Solo tariffa giornaliera'}
                              {item.pricingLogic === 'custom' && '🎯 Prezzo personalizzato'}
                            </div>
                          )}
                          
                          {item.isPriceModified && (
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#dc2626', 
                              fontWeight: '500',
                              marginTop: '4px',
                              padding: '4px 8px',
                              background: '#fee2e2',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}>
                              ⚠️ Prezzo modificato durante stipula
                            </div>
                          )}
                          
                          {item.returnedAt && (
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#059669', 
                              fontWeight: '500',
                              marginTop: '4px',
                              padding: '4px 8px',
                              background: '#d1fae5',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}>
                              ✅ Restituito il {new Date(item.returnedAt).toLocaleDateString('it-IT')}
                            </div>
                          )}
                        </div>
                        <div style={{ 
                          textAlign: 'right',
                          minWidth: '120px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <div style={{ 
                            fontSize: '14px',
                            color: '#374151',
                            fontWeight: '500'
                          }}>
                            Noleggio: €{item.basePrice.toFixed(2)}
                          </div>
                          
                          {item.insurance > 0 && (
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#059669',
                              fontWeight: '500'
                            }}>
                              Assicurazione: €{item.insurance.toFixed(2)}
                            </div>
                          )}
                          
                          <div style={{ 
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#1e293b',
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: '4px',
                            marginTop: '4px'
                          }}>
                            Totale: €{item.total.toFixed(2)}
                          </div>
                          
                          {item.returnedAt && (
                            <div style={{ 
                              fontSize: '10px',
                              color: '#6b7280',
                              fontStyle: 'italic'
                            }}>
                              (Già restituito)
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 0',
                      borderTop: '2px solid #1e293b',
                      fontSize: '1.2rem',
                      fontWeight: '700',
                      color: '#1e293b'
                    }}>
                      <span>TOTALE DA PAGARE:</span>
                      <span>€{bill.finalTotal.toFixed(2)}</span>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* SELEZIONE METODO PAGAMENTO */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '16px' }}>
                💳 Metodo di Pagamento
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setPaymentMethod('cash')}
                  style={{
                    padding: '12px 24px',
                    background: paymentMethod === 'cash' ? '#10b981' : 'white',
                    color: paymentMethod === 'cash' ? 'white' : '#374151',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  💵 Contanti
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  style={{
                    padding: '12px 24px',
                    background: paymentMethod === 'card' ? '#10b981' : 'white',
                    color: paymentMethod === 'card' ? 'white' : '#374151',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  💳 Carta
                </button>
                <button
                  onClick={() => setPaymentMethod('bank_transfer')}
                  style={{
                    padding: '12px 24px',
                    background: paymentMethod === 'bank_transfer' ? '#10b981' : 'white',
                    color: paymentMethod === 'bank_transfer' ? 'white' : '#374151',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  🏦 Bonifico
                </button>
              </div>
            </div>

            {/* NOTE PAGAMENTO */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                📝 Note Pagamento (opzionale)
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Es: Pagato in contanti, resto dato..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Annulla
              </button>
              <button
                onClick={completePayment}
                style={{
                  padding: '12px 24px',
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                ✅ Conferma Pagamento e Chiudi Contratto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAZIONE CONTRATTO */}
      {showDeleteModal && selectedContractForDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.8rem', color: '#dc2626' }}>
              🗑️ Elimina Contratto
            </h2>

            <div style={{
              background: '#fef2f2',
              border: '2px solid #fecaca',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
                ⚠️ ATTENZIONE: Questa azione è irreversibile!
              </div>
              <div style={{ fontSize: '14px', color: '#7f1d1d' }}>
                Stai per eliminare definitivamente il contratto di <strong>{selectedContractForDelete.customer?.name}</strong>.
                <br />
                ID Contratto: {selectedContractForDelete._id.slice(-8)}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Motivo dell'eliminazione *
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Es: Contratto duplicato, errore di inserimento, richiesta cliente..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
              />
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Il motivo verrà registrato nei log per tracciabilità
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Annulla
              </button>
              <button
                onClick={deleteContract}
                disabled={!deleteReason.trim()}
                style={{
                  padding: '12px 24px',
                  background: deleteReason.trim() ? '#dc2626' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: deleteReason.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                🗑️ Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAMBIO STATO */}
      {showStatusChangeModal && selectedContractForStatusChange && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.8rem', color: '#10b981' }}>
              🚀 Attiva Contratto
            </h2>

            <div style={{
              background: '#f0f9ff',
              border: '2px solid #bae6fd',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ fontWeight: '600', color: '#0369a1', marginBottom: '8px' }}>
                📋 Cambio Stato: Prenotato → In Uso
              </div>
              <div style={{ fontSize: '14px', color: '#0c4a6e' }}>
                Cliente: <strong>{selectedContractForStatusChange.customer?.name}</strong>
                <br />
                Contratto: {selectedContractForStatusChange._id.slice(-8)}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                cursor: 'pointer',
                padding: '12px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '2px solid #e5e7eb'
              }}>
                <input
                  type="checkbox"
                  checked={lockDailyRate}
                  onChange={(e) => setLockDailyRate(e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: '#374151' }}>
                    🔒 Blocca Tariffa Giornaliera
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    Calcola e blocca il prezzo finale basato sulla tariffa giornaliera attuale
                  </div>
                </div>
              </label>
            </div>

            {lockDailyRate && (
              <div style={{
                background: '#ecfdf5',
                border: '2px solid #bbf7d0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ fontWeight: '600', color: '#059669', marginBottom: '8px' }}>
                  💰 Anteprima Prezzo Bloccato
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#047857' }}>
                  €{calculateDetailedBill(selectedContractForStatusChange).finalTotal.toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', color: '#065f46', marginTop: '4px' }}>
                  Questo prezzo verrà bloccato e non cambierà più
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowStatusChangeModal(false)}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Annulla
              </button>
              <button
                onClick={changeStatusToInUse}
                style={{
                  padding: '12px 24px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                🚀 Attiva Contratto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICA PREZZO */}
      {showPriceEditModal && selectedContractForPriceEdit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1e293b'
            }}>
              💰 Modifica Prezzo Finale
            </h2>

            <div style={{
              background: '#f0f9ff',
              border: '2px solid #bae6fd',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ fontWeight: '600', color: '#0369a1', marginBottom: '8px' }}>
                📋 Contratto: {selectedContractForPriceEdit.customer?.name}
              </div>
              <div style={{ fontSize: '14px', color: '#0c4a6e' }}>
                ID: {selectedContractForPriceEdit._id.slice(-8)}
                <br />
                Prezzo Attuale: €{calculateDetailedBill(selectedContractForPriceEdit).finalTotal.toFixed(2)}
                {selectedContractForPriceEdit.customFinalPrice && (
                  <>
                    <br />
                    <span style={{ color: '#dc2626', fontWeight: '600' }}>
                      ⚠️ Prezzo personalizzato attivo: €{selectedContractForPriceEdit.customFinalPrice.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                💶 Nuovo Prezzo (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Inserisci il nuovo prezzo"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                📝 Motivo della Modifica
              </label>
              <textarea
                value={priceReason}
                onChange={(e) => setPriceReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                placeholder="Spiega il motivo della modifica del prezzo..."
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowPriceEditModal(false)}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Annulla
              </button>
              
              {selectedContractForPriceEdit.customFinalPrice && (
                <button
                  onClick={resetCustomPrice}
                  style={{
                    padding: '12px 24px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  🔄 Ripristina Automatico
                </button>
              )}
              
              <button
                onClick={updateCustomPrice}
                style={{
                  padding: '12px 24px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                💰 Aggiorna Prezzo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZZAZIONE IMMAGINE DOCUMENTO */}
      {showImageModal && selectedImage.url && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header del modal */}
            <div style={{
              padding: '16px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                📄 {selectedImage.title}
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px'
                }}
                onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.background = 'none'}
              >
                ✕
              </button>
            </div>
            
            {/* Immagine */}
            <div style={{
              padding: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <img 
                src={selectedImage.url}
                alt={selectedImage.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </div>
            
            {/* Footer con azioni */}
            <div style={{
              padding: '16px 20px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => window.open(selectedImage.url, '_blank')}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🔗 Apri in nuova finestra
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedImage.url;
                  link.download = `${selectedImage.title.replace(/[^a-z0-9]/gi, '_')}.jpg`;
                  link.click();
                }}
                style={{
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                💾 Scarica
              </button>
            </div>
          </div>
        </div>
      )}









      {/* Modal Webcam per foto documenti */}
      {showWebcamModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>
              📷 {photoType === 'front' ? 'Foto Fronte Documento' : 'Foto Retro Documento'}
            </h3>
            
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  maxWidth: '640px',
                  height: 'auto',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb'
                }}
              />
              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleCloseWebcam}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                ❌ Annulla
              </button>
              <button
                onClick={handleTakePhoto}
                disabled={!webcamStream}
                style={{
                  padding: '12px 24px',
                  background: webcamStream ? '#10b981' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: webcamStream ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                📸 Scatta Foto
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}