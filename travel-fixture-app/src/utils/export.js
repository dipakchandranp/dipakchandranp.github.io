import html2canvas from 'html2canvas-pro'

export async function exportAsImage(element) {
  if (!element) return

  try {
    // Create wrapper with padding
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'padding: 40px; background: white; display: inline-block;'
    const parent = element.parentNode
    parent.insertBefore(wrapper, element)
    wrapper.appendChild(element)

    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true
    })

    // Restore original structure
    parent.insertBefore(element, wrapper)
    parent.removeChild(wrapper)

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().slice(0, 10)
      link.download = `travel-itinerary-${timestamp}.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    })
  } catch (error) {
    console.error('Export failed:', error)
  }
}

