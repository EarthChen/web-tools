function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="glass py-4">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p className="text-white/60 text-sm">
          &copy; {currentYear} EarthChen. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer
