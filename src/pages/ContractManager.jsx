import React, { useEffect, useState, useRef } from 'react'
import { api } from '../services/api.js'
import { useNotifications } from '../Components/NotificationSystem.jsx'
import dateUtils from '../utils/dateUtils.js'
import PaymentModal from '../Components/PaymentModal.jsx'
import moment from 'moment'
import CompletedRevenueByDay from '../Components/CompletedRevenueByDay.jsx'
import { recalculateContractTotals, isConcludedContract } from '../utils/contractCalculations.js'

export default function ContractManager(){
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('week')
  const [viewDate, setViewDate] = useState(new Date())
  
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
  const [selectedItemInsurancePaidAdvance, setSelectedItemInsurancePaidAdvance] = useState({})
  const [selectedContractInsurancePaidAdvance, setSelectedContractInsurancePaidAdvance] = useState({})

  // Stato per timer di aggiornamento UI
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Stati per eliminazione contratto
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedContractForDelete, setSelectedContractForDelete] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')

  // Stati per sostituzione bici (swap)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [selectedContractForSwap, setSelectedContractForSwap] = useState(null)
  const [swapOldItemId, setSwapOldItemId] = useState(null)
  const [swapNewItemBarcode, setSwapNewItemBarcode] = useState('')
  const [swapNewItemName, setSwapNewItemName] = useState('')
  const [swapNewItemPriceHourly, setSwapNewItemPriceHourly] = useState('')
  const [swapNewItemPriceDaily, setSwapNewItemPriceDaily] = useState('')
  
  // Stati per cambio stato (prenotato -> in uso)
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false)
  const [selectedContractForStatusChange, setSelectedContractForStatusChange] = useState(null)
  const [lockDailyRate, setLockDailyRate] = useState(true)
  
  // Stati per modifica prezzo finale
  const [showPriceEditModal, setShowPriceEditModal] = useState(false)
  const [selectedContractForPriceEdit, setSelectedContractForPriceEdit] = useState(null)
  const [customPrice, setCustomPrice] = useState('')
  const [priceReason, setPriceReason] = useState('')

  // Stati per override del prezzo di singole bici nel pagamento
  const [itemPriceOverrides, setItemPriceOverrides] = useState({})
  const [editingItemPriceKey, setEditingItemPriceKey] = useState(null)
  const [itemPriceDrafts, setItemPriceDrafts] = useState({})
  
  // Stati per visualizzazione immagini documenti
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState({ url: '', title: '' })
  
  // Stati per webcam e foto documenti
  const [showWebcamModal, setShowWebcamModal] = useState(false)
  const [selectedContractForPhoto, setSelectedContractForPhoto] = useState(null)
  const [photoType, setPhotoType] = useState('') // 'front' o 'back'
  const [webcamStream, setWebcamStream] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

// selectedDate and timelineDays use local dates for UI
  // The comparison in getDayContracts uses local dates to match user's timezone
  // selectedDate uses local dates to match user's view
  const [selectedDate, setSelectedDate] = useState(() => dateUtils.startOfDay(new Date()))
  const timelineDays = Array.from({length: 14}, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + (i - 7))
    d.setHours(0, 0, 0, 0)
    return d
  })

  const getDayContracts = (date) => {
    const dayStart = dateUtils.startOfDay(date)
    const dayEnd = dateUtils.endOfDay(date)
    
    // Extract LOCAL date in YYYY-MM-DD format for comparison
    // User sees contracts in their local timezone
    const targetDate = new Date(date)
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    const targetDateStr = `${year}-${month}-${day}`
    
    return contracts.filter(contract => {
      const status = String(contract.status || '').toLowerCase()

      if (status === 'reserved') {
        const contractDate = contract.startAt || contract.reservationDate || contract.createdAt
        if (!contractDate) return true

        const contractDateObj = new Date(contractDate)
        if (Number.isNaN(contractDateObj.getTime())) return true

        const contractYear = contractDateObj.getFullYear()
        const contractMonth = String(contractDateObj.getMonth() + 1).padStart(2, '0')
        const contractDay = String(contractDateObj.getDate()).padStart(2, '0')
        const contractDateStr = `${contractYear}-${contractMonth}-${contractDay}`
        return contractDateStr === targetDateStr
      }

      const startValue = contract.startAt || contract.createdAt || contract.endAt || contract.returnedAt || contract.completedAt || contract.paymentDate
      const start = startValue ? new Date(startValue) : null

      if (!startValue || Number.isNaN(start?.getTime())) {
        return ['in-use', 'returned', 'completed', 'closed', 'reserved'].includes(status)
      }

      const end = contract.endAt ? new Date(contract.endAt) : null
      const isInRange = start <= dayEnd && (!end || end >= dayStart)
      return isInRange
    })
  }

  useEffect(() => {
    const reserved = contracts.filter(c => c.status === 'reserved')
    if (reserved.length > 0) {
      console.log('📅 Contratti prenotati:', reserved.map(c => ({
        id: c._id,
        startAt: c.startAt,
        endAt: c.endAt,
        reservationDate: c.reservationDate,
        createdAt: c.createdAt,
        status: c.status
      })))
    }
    // Log selectedDate for debugging
    console.log('📆 selectedDate iniziale:', selectedDate, 'format:', dateUtils.formatDate(selectedDate))
  }, [contracts])

const filteredContracts = getDayContracts(selectedDate).filter(c => {
    const matchesStatus = filter === 'all' || c.status === filter
    if (!matchesStatus) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    const name = (c.customer?.name || '').toLowerCase()
    const phone = (c.customer?.phone || '').toLowerCase()
    const itemsText = (c.items || []).map(i => `${i.name || ''} ${i.barcode || ''}`.toLowerCase()).join(' ')
    return name.includes(q) || phone.includes(q) || itemsText.includes(q)
  })

  const handleDateSelect = (date) => {
    setSelectedDate(dateUtils.startOfDay(date))
    setViewDate(date)
  }

  const navigateView = (direction) => {
    const newDate = new Date(viewDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7))
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction)
    }
    setViewDate(newDate)
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()
    const days = []
    for (let i = 0; i < startDayOfWeek; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const getMonthName = (date) => date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })

  const weekDays = Array.from({length: 7}, (_, i) => {
    const d = new Date(viewDate)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + i
    const result = new Date(d.setDate(diff))
    result.setHours(0, 0, 0, 0)
    return result
  })

  const getMonthContractCount = (year, month) => {
    return contracts.filter(contract => {
      const start = contract.startAt ? new Date(contract.startAt) : null
      if (!start) return false
      return start.getFullYear() === year && start.getMonth() === month
    }).length
  }

  const getStartOfWeek = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

const getEndOfWeek = (date) => {
    const d = new Date(getStartOfWeek(date))
    d.setDate(d.getDate() + 6)
    return d
  }

  const { showSuccess, showError, showWarning } = useNotifications()

  // Funzioni per gestire la webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setWebcamStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Errore accesso webcam:', error)
      // Bypass: do not show error, allow file upload
      setWebcamStream(null)
    }
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

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedFile(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTakePhoto = async () => {
    let photoData

    if (webcamStream) {
      photoData = capturePhoto()
    } else if (uploadedFile) {
      photoData = uploadedFile
    } else {
      showError('Nessuna foto disponibile. Carica un file o usa la webcam.')
      return
    }

    if (!photoData) {
      showError('Errore durante la cattura della foto')
      return
    }

    try {
      // Aggiorna il contratto con la nuova foto
      const updateData = {
        customer: { ...selectedContractForPhoto.customer }
      }
      if (photoType === 'front') {
        updateData.customer.idFrontUrl = photoData
        updateData['documentPhotos.idFront'] = photoData
      } else if (photoType === 'back') {
        updateData.customer.idBackUrl = photoData
        updateData['documentPhotos.idBack'] = photoData
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
    setUploadedFile(null)
  }

  const openWebcamModal = (contract, type) => {
    setSelectedContractForPhoto(contract)
    setPhotoType(type)
    setShowWebcamModal(true)
  }

  useEffect(() => {
    loadContracts()
  }, [])

  // Timer che aggiorna ogni secondo per visualizzare il tempo preciso
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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
      const { data } = await api.get('/api/contracts')
      
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

  const refreshConcludedContractTotals = async (contract) => {
    if (!contract || !isConcludedContract(contract)) return null;
    const newTotals = recalculateContractTotals(contract);
    try {
      await api.put(`/api/contracts/${contract._id}`, {
        totals: {
          bikesTotal: newTotals.bikesTotal,
          insuranceTotal: newTotals.insuranceTotal,
          extrasTotal: newTotals.extrasTotal,
          grandTotal: newTotals.grandTotal
        }
      });
      setContracts(prev => prev.map(c => c._id === contract._id ? { ...c, totals: newTotals } : c));
      return newTotals;
    } catch (error) {
      console.error('Errore aggiornamento totali contratto concluso:', error);
      showError(`Errore aggiornamento totali: ${error.response?.data?.error || error.message}`);
      return null;
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
      showSuccess(`✅ ${successCount} articoli restituiti con successo.`)
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

  const calculateDetailedBill = (contract) => {
    if (!contract || !contract.items || contract.items.length === 0) {
      return {
        finalTotal: 0,
        bikesTotal: 0,
        insuranceTotal: 0,
        extrasTotal: 0,
        items: [],
        duration: { hours: 0, days: 0 },
        startDate: null,
        endDate: null,
        priceSource: 'none'
      }
    }

    if (contract.customFinalPrice && contract.customFinalPrice > 0) {
      // Calcola l'assicurazione e gli extra anche per i prezzi personalizzati
      let itemInsuranceTotal = 0
      let itemExtrasTotal = 0
      
      // Assicurazione dagli items
      contract.items.forEach((item) => {
        if (item.insurance && !item.returnedAt) {
          itemInsuranceTotal += 5
        }
      })
      
      // Assicurazione flat del contratto
      if (contract.insuranceFlat && parseFloat(contract.insuranceFlat) > 0) {
        itemInsuranceTotal += parseFloat(contract.insuranceFlat)
      }
      
      // Extra charges
      if (contract.extraCharges && Array.isArray(contract.extraCharges)) {
        contract.extraCharges.forEach(charge => {
          const chargeAmount = parseFloat(charge.amount) || 0
          if (chargeAmount !== 0) {
            itemExtrasTotal += chargeAmount
          }
        })
      }
      
      return {
        finalTotal: parseFloat(contract.customFinalPrice),
        bikesTotal: 0, // Sarà calcolato dinamicamente dal componente
        insuranceTotal: Math.round(itemInsuranceTotal * 100) / 100,
        extrasTotal: Math.round(itemExtrasTotal * 100) / 100,
        items: [{
          name: '🎯 Prezzo Personalizzato',
          duration: contract.customPriceReason || 'Prezzo modificato manualmente',
          basePrice: parseFloat(contract.customFinalPrice),
          insurance: 0,
          total: parseFloat(contract.customFinalPrice),
          pricingLogic: 'custom_override'
        }],
        duration: { hours: 0, days: 0 },
        startDate: new Date(contract.startAt || contract.createdAt),
        endDate: new Date(contract.endAt || new Date()),
        priceSource: 'custom'
      }
    }

    const now = new Date()
    let totalAmount = 0
    let bikesTotal = 0
    let insuranceTotal = 0
    let extrasTotal = 0
    const billItems = []
    const contractStartDate = new Date(contract.startAt || contract.createdAt)

    contract.items.forEach((item, index) => {
      if (item.kind !== 'bike' && item.kind !== 'accessory') return

      const itemStartAt = item.startAt ? new Date(item.startAt) : contractStartDate
      const itemEndAt = item.returnedAt ? new Date(item.returnedAt) : now
      const durationMs = Math.max(0, itemEndAt - itemStartAt)
      const durationMinutes = durationMs / (1000 * 60)
      const oreFatturate = Math.max(1, Math.ceil(durationMinutes / 60))

      const totalSeconds = Math.floor(durationMs / 1000)
      const preciseHours = Math.floor(totalSeconds / 3600)
      const preciseMinutes = Math.floor((totalSeconds % 3600) / 60)
      const preciseSeconds = totalSeconds % 60

      const priceHourly = parseFloat(item.priceHourly) || 0
      const priceDaily = parseFloat(item.priceDaily) || 0

      let itemBasePrice = 0
      let pricingLogic = 'hourly'

      if (priceDaily > 0 && (priceHourly * oreFatturate) >= priceDaily) {
        itemBasePrice = priceDaily
        pricingLogic = 'hourly_capped_daily'
      } else {
        itemBasePrice = priceHourly * oreFatturate
        pricingLogic = 'hourly'
      }

      bikesTotal += itemBasePrice
      const insuranceAmount = item.insurance ? 5 : 0
      insuranceTotal += insuranceAmount
      const itemTotal = itemBasePrice + insuranceAmount
      totalAmount += itemTotal

      billItems.push({
        name: item.name || 'Item senza nome',
        duration: `${oreFatturate} ore`,
        preciseTime: { hours: preciseHours, minutes: preciseMinutes, seconds: preciseSeconds },
        basePrice: Math.round(itemBasePrice * 100) / 100,
        insurance: insuranceAmount,
        total: Math.round(itemTotal * 100) / 100,
        isReturned: !!item.returnedAt,
        pricingLogic,
        itemId: item._id || item.id || `${item.name || 'item'}-${index}`,
        kind: item.kind || 'bike'
      })
    })

    const aggregateEndDate = new Date(contract.endAt || now)
    const aggregateDurationMs = Math.max(0, aggregateEndDate - contractStartDate)
    const aggregateDurationHours = Math.max(1, Math.ceil(aggregateDurationMs / (1000 * 60 * 60)))
    const aggregateDurationDays = Math.max(1, Math.ceil(aggregateDurationHours / 24))

    if (contract.insuranceFlat && parseFloat(contract.insuranceFlat) > 0) {
      const contractInsurance = parseFloat(contract.insuranceFlat)
      insuranceTotal += contractInsurance
      totalAmount += contractInsurance
      billItems.push({
        name: 'Assicurazione Contratto',
        duration: 'Flat',
        basePrice: 0,
        insurance: contractInsurance,
        total: contractInsurance,
        isContractInsurance: true
      })
    }

    if (contract.extraCharges && Array.isArray(contract.extraCharges)) {
      contract.extraCharges.forEach(charge => {
        const chargeAmount = parseFloat(charge.amount) || 0
        if (chargeAmount !== 0) {
          extrasTotal += chargeAmount
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
      bikesTotal: Math.round(bikesTotal * 100) / 100,
      insuranceTotal: Math.round(insuranceTotal * 100) / 100,
      extrasTotal: Math.round(extrasTotal * 100) / 100,
      items: billItems,
      duration: { hours: aggregateDurationHours, days: aggregateDurationDays },
      startDate: contractStartDate,
      endDate: aggregateEndDate,
      priceSource: 'calculated'
    }
  }

  const calculatePaymentTotals = (contract) => {
    const baseBill = calculateDetailedBill(contract)

    let adjustedFinalTotal = baseBill.finalTotal
    const adjustedItems = baseBill.items.map((item) => {
      if (item.kind !== 'bike' && item.kind !== 'accessory') return item

      const itemKey = item.itemId || item.name
      const overrideValue = itemPriceOverrides[itemKey]
      if (overrideValue === undefined || overrideValue === null || Number.isNaN(parseFloat(overrideValue))) {
        return item
      }

      const normalizedOverride = Math.max(0, parseFloat(overrideValue))
      const oldBasePrice = item.basePrice || 0
      const insuranceAmount = item.insurance || 0
      const newBasePrice = Math.round(normalizedOverride * 100) / 100
      const newTotal = Math.round((newBasePrice + insuranceAmount) * 100) / 100

      adjustedFinalTotal += newBasePrice - oldBasePrice

      return {
        ...item,
        basePrice: newBasePrice,
        total: newTotal
      }
    })

    const adjustedInsuranceTotal = baseBill.insuranceTotal
    const adjustedExtrasTotal = baseBill.extrasTotal
    const adjustedBikesTotal = Math.max(0, adjustedFinalTotal - adjustedInsuranceTotal - adjustedExtrasTotal)

    return {
      ...baseBill,
      finalTotal: Math.round(adjustedFinalTotal * 100) / 100,
      bikesTotal: Math.round(adjustedBikesTotal * 100) / 100,
      insuranceTotal: adjustedInsuranceTotal,
      extrasTotal: adjustedExtrasTotal,
      items: adjustedItems
    }
  }

  // Calcola il tempo preciso in secondi per ogni item (solo per visualizzazione)
  const calculatePreciseTime = (item, contract) => {
    const now = currentTime
    const contractStartDate = new Date(contract.startAt || contract.createdAt)
    const itemStartAt = item.startAt ? new Date(item.startAt) : contractStartDate
    const itemEndAt = item.returnedAt ? new Date(item.returnedAt) : now
    const durationMs = Math.max(0, itemEndAt - itemStartAt)
    
    const totalSeconds = Math.floor(durationMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    return { hours, minutes, seconds, totalMs: durationMs }
  }

  // Formatta il tempo con ore, minuti e secondi
  const formatPreciseTime = (timeObj) => {
    const { hours, minutes, seconds } = timeObj
    return `Tempo: ${hours} ora${hours !== 1 ? 'e' : ''} ${minutes} min ${seconds} sec`
  }

  const getContractInsuranceKey = (contract) => contract?._id || contract?.id || 'default-contract'

  const getItemInsuranceFlags = (contract) => {
    const contractKey = getContractInsuranceKey(contract)
    return selectedItemInsurancePaidAdvance[contractKey] || {}
  }

  const setItemInsuranceFlag = (contract, index, value) => {
    const contractKey = getContractInsuranceKey(contract)
    setSelectedItemInsurancePaidAdvance(prev => ({
      ...prev,
      [contractKey]: {
        ...(prev[contractKey] || {}),
        [index]: value
      }
    }))
  }

  const isContractItemInsurancePaid = (contract) => {
    if (!contract?.items?.length) return false
    return contract.items.every((item, idx) => !item.insurance || item.returnedAt || getItemInsuranceFlags(contract)[idx])
  }

  const setContractItemInsurancePaid = (contract, value) => {
    const contractKey = getContractInsuranceKey(contract)
    setSelectedItemInsurancePaidAdvance(prev => {
      const next = { ...(prev[contractKey] || {}) }
      contract.items?.forEach((item, idx) => {
        if (item.insurance && !item.returnedAt) {
          next[idx] = value
        }
      })
      return { ...prev, [contractKey]: next }
    })
  }

  const getContractInsuranceFlag = (contract) => {
    const contractKey = getContractInsuranceKey(contract)
    return !!selectedContractInsurancePaidAdvance[contractKey]
  }

  const setContractInsuranceFlag = (contract, value) => {
    const contractKey = getContractInsuranceKey(contract)
    setSelectedContractInsurancePaidAdvance(prev => ({
      ...prev,
      [contractKey]: value
    }))
  }

  // Calcola il totale delle assicurazioni pagate in anticipo
  const calculateInsurancePaidInAdvance = (contract) => {
    if (!contract || !contract.items) return 0
    
    let totalPaid = 0
    
    contract.items.forEach((item, index) => {
      if (item.insurance && getItemInsuranceFlags(contract)[index]) {
        totalPaid += 5
      }
    })
    
    if (getContractInsuranceFlag(contract) && contract.insuranceFlat) {
      totalPaid += parseFloat(contract.insuranceFlat)
    }
    
    return Math.round(totalPaid * 100) / 100
  }

  // STEP 4: PAGAMENTO (solo per collega ufficio)
  const openPaymentModal = (contract) => {
    setSelectedContractForPayment(contract)
    setPaymentMethod('cash')
    setPaymentNotes('')
    setItemPriceOverrides({})
    setEditingItemPriceKey(null)
    setItemPriceDrafts({})
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
      const bill = calculatePaymentTotals(selectedContractForPayment)
      const finalizedItems = bill.items.map((item) => ({
        ...item,
        rentalPrice: item.basePrice,
        totalPrice: item.total
      }))
      
      // Prepara i dati delle assicurazioni pagate in anticipo
      const itemInsurancePaidAdvanceData = {}
      selectedContractForPayment.items.forEach((item, index) => {
        if (getItemInsuranceFlags(selectedContractForPayment)[index]) {
          itemInsurancePaidAdvanceData[item._id || index] = true
        }
      })

      // Calcola l'importo totale completo (con assicurazione) per i ricavi giornalieri
      const totalWithInsurance = bill.finalTotal
      let amountToPay = totalWithInsurance
      
      if (Object.keys(itemInsurancePaidAdvanceData).length > 0 || selectedContractInsurancePaidAdvance) {
        let insuranceToSubtract = 0
        
        Object.keys(itemInsurancePaidAdvanceData).forEach(key => {
          const item = selectedContractForPayment.items.find(i => i._id === key || i._id === undefined)
          if (item && item.insurance) {
            insuranceToSubtract += 5
          }
        })
        
        if (getContractInsuranceFlag(selectedContractForPayment) && selectedContractForPayment.insuranceFlat) {
          insuranceToSubtract += parseFloat(selectedContractForPayment.insuranceFlat)
        }
        
        amountToPay = bill.finalTotal - insuranceToSubtract
      }
      
      await api.post(`/api/contracts/${selectedContractForPayment._id}/complete-payment`, {
        paymentMethod,
        paymentNotes: paymentNotes || '',
        finalAmount: Math.max(0, amountToPay),
        totalWithInsurance: Math.round(totalWithInsurance * 100) / 100,
        itemInsurancePaidAdvance: itemInsurancePaidAdvanceData,
        contractInsurancePaidAdvance: getContractInsuranceFlag(selectedContractForPayment),
        totals: {
          bikesTotal: bill.bikesTotal,
          insuranceTotal: bill.insuranceTotal,
          extrasTotal: bill.extrasTotal,
          grandTotal: bill.finalTotal
        },
        adjustedItems: finalizedItems,
        itemPriceOverrides: Object.fromEntries(
          Object.entries(itemPriceOverrides).filter(([, value]) => value !== undefined && value !== null)
        )
      })
      
      showSuccess(`✅ Pagamento di €${amountToPay.toFixed(2)} completato e contratto chiuso!`)
      setShowPaymentModal(false)
      setSelectedContractForPayment(null)
      setPaymentMethod('')
      setPaymentNotes('')
      setItemPriceOverrides({})
      setEditingItemPriceKey(null)
      setItemPriceDrafts({})
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

  const openSwapModal = (contract, itemId) => {
    setSelectedContractForSwap(contract)
    setSwapOldItemId(itemId)
    setSwapNewItemBarcode('')
    setSwapNewItemName('')
    setSwapNewItemPriceHourly('')
    setSwapNewItemPriceDaily('')
    setShowSwapModal(true)
  }

  const handleSwapBike = async () => {
    if (!selectedContractForSwap || !swapOldItemId) {
      showError('Nessun contratto o articolo selezionato')
      return
    }

    if (!swapNewItemName.trim() || !swapNewItemPriceHourly || !swapNewItemPriceDaily) {
      showError('Inserisci nome e prezzi della nuova bici/accessorio')
      return
    }

    const oldItem = selectedContractForSwap.items.find(i => i._id === swapOldItemId)
    if (!oldItem) {
      showError('Articolo vecchio non trovato')
      return
    }

    setLoading(true)
    try {
      const now = new Date().toISOString()

      const updatedItems = selectedContractForSwap.items.map(item => {
        if (item._id === swapOldItemId) {
          return {
            ...item,
            status: 'returned',
            returnedAt: now
          }
        }
        return item
      })

      const newItem = {
        name: swapNewItemName.trim(),
        barcode: swapNewItemBarcode.trim() || undefined,
        kind: oldItem.kind || 'bike',
        priceHourly: parseFloat(swapNewItemPriceHourly),
        priceDaily: parseFloat(swapNewItemPriceDaily),
        status: 'in-use',
        startAt: now,
        returnedAt: undefined,
        refId: undefined,
        photoUrl: undefined
      }

      await api.put(`/api/contracts/${selectedContractForSwap._id}`, {
        items: [...updatedItems, newItem]
      })

      showSuccess('✅ Sostituzione effettuata: la vecchia bici è stata chiusa e la nuova è attiva')
      setShowSwapModal(false)
      setSelectedContractForSwap(null)
      setSwapOldItemId(null)
      setSwapNewItemBarcode('')
      setSwapNewItemName('')
      setSwapNewItemPriceHourly('')
      setSwapNewItemPriceDaily('')
      await loadContracts()

    } catch (error) {
      console.error('Errore sostituzione bici:', error)
      showError(`Errore sostituzione: ${error.response?.data?.error || error.message}`)
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
      if (isConcludedContract({ ...selectedContractForPriceEdit, customFinalPrice: priceValue })) {
        await refreshConcludedContractTotals({ ...selectedContractForPriceEdit, customFinalPrice: priceValue })
      }
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

      // Aggiornamento ottimistico dello stato
      setContracts(prev => prev.map(c => 
        c._id === selectedContractForPriceEdit._id 
          ? { ...c, customFinalPrice: null, customPriceReason: null }
          : c
      ))

      const customerName = selectedContractForPriceEdit.customer?.name || 'Cliente'
      showSuccess(`🔄 Prezzo di ${customerName} ripristinato al calcolo automatico`)
      setShowPriceEditModal(false)
      setSelectedContractForPriceEdit(null)
      setCustomPrice('')
      setPriceReason('')
      if (isConcludedContract({ ...selectedContractForPriceEdit, customFinalPrice: null })) {
        await refreshConcludedContractTotals({ ...selectedContractForPriceEdit, customFinalPrice: null })
      }
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
      await api.put(`/api/contracts/${selectedContractForStatusChange._id}`, {
        status: 'in-use',
        actualStartAt: new Date().toISOString()
      })
      
      const customerName = selectedContractForStatusChange.customer?.name || 'Cliente'
      showSuccess(`✅ Contratto di ${customerName} attivato!`)
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

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes bikeBounce {
            0% { transform: translateY(0); }
            100% { transform: translateY(-6px); }
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

      {/* FILTRO GIORNALIERO - TIMELINE */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '2px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>
            📅 Calendario Contratti
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => navigateView(-1)}
                style={{
                  padding: '6px 12px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                ◀
              </button>
              <button
                onClick={() => navigateView(1)}
                style={{
                  padding: '6px 12px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                ▶
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '4px' }}>
              {['week', 'month', 'year'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '6px 16px',
                    background: viewMode === mode ? '#3b82f6' : '#f3f4f6',
                    color: viewMode === mode ? 'white' : '#374151',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  {mode === 'week' ? 'Settimana' : mode === 'month' ? 'Mese' : 'Anno'}
                </button>
              ))}
            </div>
            
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              {viewMode === 'week' 
                ? `${getStartOfWeek(viewDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} - ${getEndOfWeek(viewDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : viewMode === 'month' 
                  ? getMonthName(viewDate)
                  : viewDate.getFullYear()
              }
            </div>
          </div>
        </div>

        {/* Vista Settimana */}
        {viewMode === 'week' && (
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '8px 4px',
            scrollBehavior: 'smooth',
            alignItems: 'center'
          }}>
{weekDays.map(day => {
               const isToday = dateUtils.isSameDay(day, dateUtils.startOfDay(new Date()))
               const isSelected = dateUtils.isSameDay(day, selectedDate)
               const dayContracts = getDayContracts(day)
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateSelect(day)}
                  style={{
                    minWidth: '80px',
                    padding: '12px 8px',
                    background: isSelected 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                      : isToday 
                        ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                        : '#f8fafc',
                    color: isSelected ? 'white' : isToday ? '#92400e' : '#374151',
                    border: isSelected 
                      ? '3px solid #1e40af' 
                      : isToday 
                        ? '2px solid #f59e0b'
                        : '2px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    boxShadow: isSelected 
                      ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                      : '0 1px 3px rgba(0,0,0,0.1)',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  <div style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    opacity: 0.8
                  }}>
                    {dateUtils.getDayName(day, true)}
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '800'
                  }}>
                    {day.getDate()}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    opacity: 0.7
                  }}>
                    {dateUtils.getMonthName(day, true)}
                  </div>
                  
                  {isToday && (
                    <div style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '-8px',
                      fontSize: '18px',
                      animation: 'bikeBounce 1s ease-in-out infinite'
                    }}>
                      🚲
                    </div>
                  )}
                  
                  {dayContracts.length > 0 && (
                    <div style={{
                      marginTop: '4px',
                      padding: '2px 6px',
                      background: isSelected ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: '700'
                    }}>
                      {dayContracts.length}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Vista Mese */}
        {viewMode === 'month' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              marginBottom: '8px'
            }}>
              {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(dayName => (
                <div key={dayName} style={{
                  padding: '8px 4px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  background: '#f8fafc',
                  borderRadius: '6px'
                }}>
                  {dayName}
                </div>
              ))}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px'
            }}>
              {getDaysInMonth(viewDate).map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} style={{ padding: '8px', minHeight: '60px' }}></div>
                }
                
                const isToday = dateUtils.isSameDay(day, new Date())
                const isSelected = dateUtils.isSameDay(day, selectedDate)
                const dayContracts = getDayContracts(day)
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateSelect(day)}
                    style={{
                      padding: '12px 8px',
                      minHeight: '60px',
                      background: isSelected 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                        : isToday 
                          ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                          : '#f8fafc',
                      color: isSelected ? 'white' : isToday ? '#92400e' : '#374151',
                      border: isSelected 
                        ? '2px solid #1e40af' 
                        : isToday 
                          ? '2px solid #f59e0b'
                          : '2px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>
                      {day.getDate()}
                    </div>
                    {dayContracts.length > 0 && (
                      <div style={{
                        padding: '2px 6px',
                        background: isSelected ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: '700'
                      }}>
                        {dayContracts.length}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Vista Anno */}
        {viewMode === 'year' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px'
          }}>
            {['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'].map((monthName, monthIdx) => {
              const monthContracts = getMonthContractCount(viewDate.getFullYear(), monthIdx)
              const monthDate = new Date(viewDate.getFullYear(), monthIdx, 1)
              
              return (
                <button
                  key={monthIdx}
                  onClick={() => {
                    setViewMode('month')
                    setViewDate(monthDate)
                  }}
                  style={{
                    padding: '20px 12px',
                    minHeight: '80px',
                    background: '#f8fafc',
                    color: '#374151',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: '700' }}>
                    {monthName}
                  </div>
                  {monthContracts > 0 && (
                    <div style={{
                      padding: '4px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {monthContracts}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
        
        <div style={{
          marginTop: '12px',
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#6b7280',
          flexWrap: 'wrap'
        }}>
          <span>📁 {filteredContracts.length} contratti nel giorno selezionato</span>
          <span>🚲 Oggi</span>
          <span>📅 Passato</span>
          <span>🔮 Futuro</span>
        </div>
      </div>

      {/* 📁 I Contratti */}
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📁 I Contratti
        <span style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#6b7280',
          background: '#f3f4f6',
          padding: '4px 12px',
          borderRadius: '20px'
        }}>
          {filteredContracts.length} contratti
        </span>
      </h2>

      <CompletedRevenueByDay contracts={contracts} selectedDate={selectedDate} viewMode={viewMode} viewDate={viewDate} />

      {/* Barra di ricerca globale */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        border: '2px solid #e5e7eb'
      }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '700',
          color: '#1e293b',
          fontSize: '16px'
        }}>
          🔍 Cerca Contratto...
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Inserisci nome cliente, modello bici, targa o barcode..."
          style={{
            width: '100%',
            padding: '14px 18px',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '16px',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease',
            outline: 'none',
            background: '#fafafa'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6'
            e.target.style.background = '#ffffff'
            e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb'
            e.target.style.background = '#fafafa'
            e.target.style.boxShadow = 'none'
          }}
        />
        {searchQuery.trim() && (
          <div style={{
            marginTop: '8px',
            fontSize: '13px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            {filteredContracts.length} risultato/i per "{searchQuery.trim()}"
          </div>
      )}
      
      {/* Modal per pagamento */}
      {showPaymentModal && selectedContractForPayment && (
        <PaymentModal
          contract={selectedContractForPayment}
          initialItemInsurancePaidAdvance={selectedItemInsurancePaidAdvance}
          initialContractInsurancePaidAdvance={selectedContractInsurancePaidAdvance}
          onItemInsuranceFlagChange={(contractData, index, value) => setItemInsuranceFlag(contractData, index, value)}
          onContractInsuranceFlagChange={(contractData, value) => setContractInsuranceFlag(contractData, value)}
          onPaymentComplete={() => {
            setShowPaymentModal(false);
            setSelectedContractForPayment(null);
            loadContracts();
          }}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedContractForPayment(null);
          }}
        />
      )}
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredContracts.map(contract => (
          <div key={contract._id} style={{
            background: '#fffbeb',
            borderRadius: '4px',
            padding: '24px',
            border: contract.validationErrors?.length > 0 ? '2px solid #f59e0b' : '2px solid #d6d3d1',
            borderLeft: contract.validationErrors?.length > 0 ? '6px solid #f59e0b' : '6px solid #78716c',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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

                {/* PAGAMENTO */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    background: contract.paymentCompleted ? '#dcfce7' : (contract.status === 'reserved' ? '#fef3c7' : '#fee2e2'),
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: contract.paymentCompleted ? '#166534' : (contract.status === 'reserved' ? '#92400e' : '#dc2626')
                  }}>
                    💳 {contract.status === 'reserved' ? 'Già pagato tramite link' : (contract.paymentCompleted ? 'Pagato' : 'Non pagato')}
                  </div>
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
                            src={(contract.customer?.idFrontUrl || contract.documentPhotos?.idFront)?.startsWith('data:') ? (contract.customer?.idFrontUrl || contract.documentPhotos?.idFront) : `${contract.customer?.idFrontUrl || contract.documentPhotos?.idFront}?t=${Date.now()}`}
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
                            onClick={() => openImageModal((contract.customer?.idFrontUrl || contract.documentPhotos?.idFront)?.startsWith('data:') ? (contract.customer?.idFrontUrl || contract.documentPhotos?.idFront) : `${contract.customer?.idFrontUrl || contract.documentPhotos?.idFront}?t=${Date.now()}`, 'Documento d\'identità - Fronte')}
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
                            src={(contract.customer?.idBackUrl || contract.documentPhotos?.idBack)?.startsWith('data:') ? (contract.customer?.idBackUrl || contract.documentPhotos?.idBack) : `${contract.customer?.idBackUrl || contract.documentPhotos?.idBack}?t=${Date.now()}`}
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
                            onClick={() => openImageModal((contract.customer?.idBackUrl || contract.documentPhotos?.idBack)?.startsWith('data:') ? (contract.customer?.idBackUrl || contract.documentPhotos?.idBack) : `${contract.customer?.idBackUrl || contract.documentPhotos?.idBack}?t=${Date.now()}`, 'Documento d\'identità - Retro')}
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
                            {contract.status === 'in-use' && !item.returnedAt && (
                              <>
                                <div style={{
                                  fontSize: '11px',
                                  color: '#3b82f6',
                                  fontWeight: '600',
                                  marginTop: '2px'
                                }}>
                                  {formatPreciseTime(calculatePreciseTime(item, contract))}
                                </div>
                                <button
                                  onClick={() => openSwapModal(contract, item._id)}
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
                                  🔄 Sostituisci
                                </button>
                              </>
                            )}
                  </div>
                </div>

                {/* Riepilogo prezzo */}
                {(() => {
                  const bill = calculateDetailedBill(contract)
                  const hasCustomPrice = contract.customFinalPrice && contract.customFinalPrice > 0
                  
                  // Per i prezzi personalizzati, ricalcola la quota base sottraendo assicurazione e extra dal totale custom
                  const insuranceTotal = bill.insuranceTotal
                  const extrasTotal = bill.extrasTotal
                  const displayTotal = bill.finalTotal
                  const baseTotal = hasCustomPrice
                    ? Math.round((displayTotal - insuranceTotal - extrasTotal) * 100) / 100
                    : bill.bikesTotal

                  return (
                    <div style={{
                      marginTop: '8px',
                      background: hasCustomPrice ? '#fdf4ff' : '#f8fafc',
                      borderRadius: '8px',
                      padding: '12px',
                      border: hasCustomPrice ? '2px dashed #c084fc' : '1px solid #e2e8f0'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <tbody>
                          {hasCustomPrice && (
                            <tr>
                              <td style={{ padding: '4px 0', color: '#a21caf', fontStyle: 'italic' }} colSpan="2">
                                🎯 Prezzo personalizzato attivo
                                {contract.customPriceReason && ` (${contract.customPriceReason})`}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td style={{ padding: '4px 0', color: '#374151' }}>Quota base</td>
                            <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600', color: '#374151' }}>€{baseTotal.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', color: '#059669' }}>Assicurazione</td>
                            <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600', color: '#059669' }}>€{insuranceTotal.toFixed(2)}</td>
                          </tr>
                          {extrasTotal > 0 && (
                            <tr>
                              <td style={{ padding: '4px 0', color: '#f59e0b' }}>Costi extra</td>
                              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600', color: '#f59e0b' }}>€{extrasTotal.toFixed(2)}</td>
                            </tr>
                          )}
                          <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                            <td style={{ padding: '4px 0', fontWeight: '700', color: hasCustomPrice ? '#a21caf' : '#1e293b' }}>Totale</td>
                            <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: hasCustomPrice ? '#a21caf' : '#1e293b' }}>€{displayTotal.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
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
                  <>
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
                     {contract.items?.some(item => item.insurance && !item.returnedAt) && (
                       <button
                         type="button"
                         onClick={() => setContractItemInsurancePaid(contract, !isContractItemInsurancePaid(contract))}
                         style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '6px',
                           padding: '6px 10px',
                           background: isContractItemInsurancePaid(contract) ? '#fef3c7' : '#f0fdf4',
                           color: '#374151',
                           border: '1px solid #e5e7eb',
                           borderRadius: '6px',
                           cursor: 'pointer',
                           fontSize: '12px',
                           fontWeight: '600'
                         }}
                       >
                         <span>{isContractItemInsurancePaid(contract) ? '✔' : '○'}</span>
                         <span>Assicurazione articoli pagata</span>
                       </button>
                     )}
                     {contract.insuranceFlat && parseFloat(contract.insuranceFlat) > 0 && (
                       <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 10px', background: getContractInsuranceFlag(contract) ? '#fef3c7' : '#f0fdf4', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '500' }}>
                         <input
                           type="checkbox"
                           checked={getContractInsuranceFlag(contract)}
                           onChange={(e) => setContractInsuranceFlag(contract, e.target.checked)}
                         />
                         <span style={{ color: '#374151' }}>
                           {getContractInsuranceFlag(contract) ? '✔ ' : ''}Assicurazione contratto pagata
                         </span>
                       </label>
                     )}
                  </>
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
                    <div style={{ fontWeight: '600', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.kind === 'bike' ? '🚴' : '🎒'} {item.name}
                    </div>
                    {item.barcode && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Barcode: {item.barcode}
                      </div>
                    )}
                    {item.insurance && (
                      <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>
                         🛡️ Assicurazione: €5,00
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {item.insurance && (
                      <button
                        onClick={() => {
                          const itemIndex = selectedContractForReturn.items?.findIndex(i => i._id === item._id)
                          if (itemIndex !== -1) {
                            setItemInsuranceFlag(selectedContractForReturn, itemIndex, true)
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        💰 Pagamento Assicurazione
                      </button>
                    )}
                    
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
                </div>
              ))}
            </div>

            {/* Assicurazione flat contratto nel modal del rientro */}
            {selectedContractForReturn.insuranceFlat && parseFloat(selectedContractForReturn.insuranceFlat) > 0 && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #fde68a'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#92400e', fontWeight: '500' }}>
                    🛡️ Assicurazione Contratto Flat: €{parseFloat(selectedContractForReturn.insuranceFlat).toFixed(2)}
                  </span>
                  <button
                    onClick={() => setContractInsuranceFlag(selectedContractForReturn, true)}
                    style={{
                      padding: '6px 12px',
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    💰 Pagamento Assicurazione
                  </button>
                </div>
              </div>
            )}

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
                const bill = calculatePaymentTotals(selectedContractForPayment)
                return (
                  <>
                    <div style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
                      <div>📅 Dal: {bill.startDate?.toLocaleString('it-IT')}</div>
                      <div>📅 Al: {bill.endDate?.toLocaleString('it-IT')}</div>
                      <div>⏱️ Ore fatturate: {bill.duration.hours} (Totale: {bill.duration.days} giorni)</div>
                    </div>

                    <div style={{ marginBottom: '12px', fontSize: '12px', color: '#6b7280' }}>
                      ✏️ Se serve, puoi correggere il totale di ogni bici direttamente qui prima di confermare il pagamento.
                    </div>

                    {bill.items.map((item, idx) => {
                      const itemKey = item.itemId || idx
                      const isEditableItem = !item.isContractInsurance && !item.isExtraCharge && item.pricingLogic !== 'custom_override' && (item.kind === 'bike' || item.kind === 'accessory')
                      const currentRentalValue = itemPriceOverrides[itemKey] !== undefined && itemPriceOverrides[itemKey] !== null
                        ? parseFloat(itemPriceOverrides[itemKey])
                        : item.basePrice
                      const isEditingThisItem = editingItemPriceKey === itemKey

                      return (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 0',
                          borderBottom: '1px solid #e5e7eb',
                          gap: '12px'
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
                             {item.pricingLogic === 'custom_override' ? '💰' : item.isContractInsurance ? '🛡️' : item.isExtraCharge ? '➕' : '🚴'} {item.name}
                             {item.isReturned ? ' ✅' : ''}
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
                             {item.preciseTime && (
                               <div>🕐 {item.preciseTime.hours}h {item.preciseTime.minutes}m {item.preciseTime.seconds}s</div>
                             )}
                           </div>
                          
                           {item.pricingLogic && (
                             <div style={{ 
                               fontSize: '11px', 
                               color: '#1e40af',
                               fontWeight: '500',
                               marginTop: '4px',
                               padding: '4px 8px',
                               background: '#dbeafe',
                               borderRadius: '4px',
                               display: 'inline-block'
                             }}>
                               {item.pricingLogic === 'hourly' && '⏰ Tariffa oraria'}
                               {item.pricingLogic === 'hourly_capped_daily' && '⚡ Bloccato su tariffa giornaliera'}
                               {item.pricingLogic === 'custom_override' && '🎯 Prezzo personalizzato'}
                             </div>
                           )}
                        </div>

                        <div style={{
                          textAlign: 'right',
                          minWidth: '180px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <div style={{ 
                            fontSize: '14px',
                            color: '#374151',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px'
                          }}>
                            <span>Noleggio: €{item.basePrice.toFixed(2)}</span>
                            {isEditableItem && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemPriceKey(itemKey)
                                  setItemPriceDrafts(prev => ({ ...prev, [itemKey]: (currentRentalValue || item.basePrice || 0).toFixed(2) }))
                                }}
                                style={{
                                  border: 'none',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  borderRadius: '999px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}
                                title="Modifica il prezzo finale di questa voce"
                              >
                                ✏️
                              </button>
                            )}
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
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '6px'
                          }}>
                            <span>Totale: €{item.total.toFixed(2)}</span>
                          </div>

                          {isEditableItem && isEditingThisItem && (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={itemPriceDrafts[itemKey] ?? ''}
                                onChange={(e) => setItemPriceDrafts(prev => ({ ...prev, [itemKey]: e.target.value }))}
                                style={{
                                  width: '90px',
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '12px'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const parsedValue = parseFloat(itemPriceDrafts[itemKey])
                                  if (!Number.isNaN(parsedValue) && parsedValue >= 0) {
                                    setItemPriceOverrides(prev => ({ ...prev, [itemKey]: parsedValue }))
                                  }
                                  setEditingItemPriceKey(null)
                                }}
                                style={{
                                  padding: '4px 8px',
                                  background: '#16a34a',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                Salva
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemPriceKey(null)
                                }}
                                style={{
                                  padding: '4px 8px',
                                  background: '#e5e7eb',
                                  color: '#374151',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                Annulla
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      )
                    })}
                    
                    {/* Riepilogo contratto ricalcolato */}
                    {(() => {
                      const bill = calculatePaymentTotals(selectedContractForPayment)
                      const hasContractInsurance = selectedContractForPayment.insuranceFlat && parseFloat(selectedContractForPayment.insuranceFlat) > 0
                      const insurancePaid = calculateInsurancePaidInAdvance(selectedContractForPayment)
                      const finalToPay = bill.finalTotal - insurancePaid
                      
                      return (
                        <>
                          <div style={{
                            marginTop: '16px',
                            padding: '14px',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '10px'
                          }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#065f46', marginBottom: '8px' }}>
                              🔄 Ricalcolo contratto finale
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                              <span style={{ color: '#6b7280' }}>Noleggio bici</span>
                              <span style={{ fontWeight: '600', color: '#1f2937' }}>€{bill.bikesTotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                              <span style={{ color: '#6b7280' }}>Assicurazione</span>
                              <span style={{ fontWeight: '600', color: '#1f2937' }}>€{bill.insuranceTotal.toFixed(2)}</span>
                            </div>
                            {bill.extrasTotal > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                                <span style={{ color: '#6b7280' }}>Extra</span>
                                <span style={{ fontWeight: '600', color: '#1f2937' }}>€{bill.extrasTotal.toFixed(2)}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: '15px', fontWeight: '700', borderTop: '1px solid #a7f3d0', marginTop: '6px' }}>
                              <span style={{ color: '#065f46' }}>Totale contratto</span>
                              <span style={{ color: '#065f46' }}>€{bill.finalTotal.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Insurance payment and three-distinct totals */}
                          {bill.items.map((item, idx) => {
                            const itemIndex = selectedContractForPayment.items?.findIndex(i => i._id === item._id)
                            const itemInsuranceFlags = getItemInsuranceFlags(selectedContractForPayment)
                            if (!item.insurance || itemInsuranceFlags[itemIndex]) return null
                            return (
                              <div key={`insurance-${idx}`} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 0',
                                borderBottom: '1px solid #e5e7eb'
                              }}>
                                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                  🛡️ Assicurazione {item.name}
                                </span>
                                <button
                                  onClick={() => {
                                    if (itemIndex !== -1) {
                                      setItemInsuranceFlag(selectedContractForPayment, itemIndex, true)
                                    }
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                  }}
                                >
                                  💰 Segna Pagata
                                </button>
                              </div>
                            )
                          })}
                          
                          {hasContractInsurance && !getContractInsuranceFlag(selectedContractForPayment) && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 0',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                🛡️ Assicurazione Contratto
                              </span>
                              <button
                                onClick={() => setContractInsuranceFlag(selectedContractForPayment, true)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#f59e0b',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  fontWeight: '500'
                                }}
                              >
                                💰 Segna Pagata
                              </button>
                            </div>
                          )}
                          
                          {getContractInsuranceFlag(selectedContractForPayment) && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 0',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              <span style={{ fontSize: '14px', color: '#059669' }}>
                                ✅ Assicurazione Contratto (Pagata)
                              </span>
                              <span style={{ fontSize: '14px', color: '#059669' }}>
                                €{parseFloat(selectedContractForPayment.insuranceFlat).toFixed(2)}
                              </span>
                            </div>
                          )}
                          
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                              TOTALE CONTRATTO
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                              €{bill.finalTotal.toFixed(2)}
                            </span>
                          </div>
                          
                          {insurancePaid > 0 && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 0',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              <span style={{ fontSize: '14px', color: '#059669', fontWeight: '500' }}>
                                GIÀ PAGATO (Assicurazioni)
                              </span>
                              <span style={{ fontSize: '16px', fontWeight: '600', color: '#059669' }}>
                                €{insurancePaid.toFixed(2)}
                              </span>
                            </div>
                          )}
                          
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 0',
                            borderTop: '2px solid #1e293b',
                            fontSize: '1.2rem',
                            fontWeight: '700',
                            color: '#dc2626'
                          }}>
                            <span>DA PAGARE FINALE:</span>
                            <span>€{finalToPay.toFixed(2)}</span>
                          </div>
                        </>
                      )
                    })()}
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

      {/* MODAL SOSTITUZIONE BICI */}
      {showSwapModal && selectedContractForSwap && (
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
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.8rem', color: '#1e293b' }}>
              🔄 Sostituisci Articolo
            </h2>

            <div style={{
              background: '#fef3c7',
              border: '2px solid #fde68a',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                📋 Contratto: {selectedContractForSwap.customer?.name}
              </div>
              <div style={{ fontSize: '14px', color: '#78350f' }}>
                Articolo da sostituire: {selectedContractForSwap.items.find(i => i._id === swapOldItemId)?.name}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Nome Nuovo Articolo *
                </label>
                <input
                  type="text"
                  value={swapNewItemName}
                  onChange={(e) => setSwapNewItemName(e.target.value)}
                  placeholder="Es: Bici city, Casco, Lucchetto..."
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
                  Barcode (opzionale)
                </label>
                <input
                  type="text"
                  value={swapNewItemBarcode}
                  onChange={(e) => setSwapNewItemBarcode(e.target.value)}
                  placeholder="Codice a barre..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Prezzo Orario (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={swapNewItemPriceHourly}
                    onChange={(e) => setSwapNewItemPriceHourly(e.target.value)}
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
                    Prezzo Giornaliero (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={swapNewItemPriceDaily}
                    onChange={(e) => setSwapNewItemPriceDaily(e.target.value)}
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
                onClick={() => setShowSwapModal(false)}
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
                onClick={handleSwapBike}
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
                🔄 Conferma Sostituzione
              </button>
            </div>
          </div>
        </div>
      )}
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
              <div style={{ fontSize: '14px', color: '#374151' }}>
                Il contratto passerà allo stato <strong>In Uso</strong>. Il prezzo sarà calcolato automaticamente secondo la tariffa oraria con blocco giornaliero per ogni articolo.
              </div>
            </div>

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
              {!webcamStream && (
                <p style={{ margin: '0 0 16px 0', color: '#ef4444', fontWeight: '600' }}>
                  ⚠️ Fotocamera non disponibile - usa il file upload sotto
                </p>
              )}
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
              <div style={{ marginTop: '16px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
                  Oppure carica un'immagine dal dispositivo:
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  style={{
                    padding: '8px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    width: '100%',
                    maxWidth: '300px'
                  }}
                />
                {uploadedFile && (
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
                      Anteprima immagine caricata:
                    </p>
                    <img
                      src={uploadedFile}
                      alt="Preview"
                      style={{
                        width: '100%',
                        maxWidth: '640px',
                        height: 'auto',
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb'
                      }}
                    />
                  </div>
                )}
              </div>
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
                disabled={!webcamStream && !uploadedFile}
                style={{
                  padding: '12px 24px',
                  background: (webcamStream || uploadedFile) ? '#10b981' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (webcamStream || uploadedFile) ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                {webcamStream ? '📸 Scatta Foto' : '💾 Salva Foto'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}