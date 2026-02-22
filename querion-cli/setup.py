from setuptools import setup, find_packages

setup(
    name="querion-cli",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "click",
        "requests",
        "watchdog",
        "colorama"
    ],
    entry_points={
        "console_scripts": [
            "querion=querion_cli.main:main",
        ],
    },
)
